# TupTUp — Architecture Overview

## High-Level Goal

A simple, self-hosted CI pipeline runner for personal projects. Runs on a home server. Written in TypeScript.

---

## Core Concepts

### Runner

The top-level coordinator. Owns the full run lifecycle:

```
Runner
  → Provisioner   (prepare, clone, parseConfig — produces PipelineContext)
  → Workflow      (sequences jobs, owns executor/runner lifecycle per job)
  → Teardown      (cleanup — always runs via finally)
```

Wires in cross-cutting concerns: logging, event emission.

> `Runner` is what runs a pipeline. `Pipeline` is the thing being run — the parsed config and its data.

### Provisioner

Owns the entire "get ready" phase. By the time it's done, `PipelineContext` is fully populated and everything downstream needs is available:

- Creates the run workspace directory
- Clones the repo
- Finds and parses the pipeline config YAML
- Derives all paths (workspace, repo, artifacts)

Produces a fully populated `PipelineContext` — no partial state leaks into `Workflow`.

May have additional sub-responsibilities discovered during implementation.

### Workflow

Sequences and runs user-defined jobs. Receives the fully populated `PipelineContext` from `Provisioner` via `Runner`:

- Depends on both `Lifecycle` and `Executor` — manages container lifecycle and delegates execution
- Creates one `DockerExecutor` per job, calls `start()`/`stop()` around each job
- Instantiates a scoped `Logger` per job
- Injects the event emitter (received from `Runner`) into each job
- Enforces the hard-stop rule on job failure

### Teardown

Cleans up after the pipeline run. Receives the full `PipelineContext` — at minimum uses `workspacePath` to remove the run directory. Always runs via `finally`, guaranteed even on failure.

### Pipeline

The data — the parsed config and its definition. Not the thing that runs it. Contains job definitions, images, steps, etc.

### PipelineContext

Fully populated by `Provisioner`. Passed through to `Workflow` and `Teardown` by `Runner`:

```typescript
interface PipelineContext {
  repoUrl: string
  repoName: string       // derived from repoUrl
  runId: string
  workspacePath: string  // /tmp/ci-runs/<runId>
  repoPath: string       // /tmp/ci-runs/<runId>/<repoName>
  artifactsPath: string  // /tmp/ci-runs/<runId>/artifacts
  config: PipelineConfig // parsed from the repo
}
```

`repoUrl` comes from the trigger event — not the config. The config doesn't exist yet when cloning happens. All paths are derived by `Provisioner`.

### Job

User-defined work. Depends only on `Executor` — no knowledge of Docker, file system, or logging implementation:

```typescript
class Job {
  constructor(
    private definition: JobDefinition,
    private executor: Executor,
    private logger: Logger,
    private events: EventEmitter,
  )
}
```

`Job` is fully testable in isolation by swapping in a `DryRunExecutor` and a mock logger.

---

## Execution Flow

```
[Provisioner] → [Workflow] → [Teardown]  (Teardown always runs)
                    ↓
             [job 1] → [job 2] → ...     (hard stop on failure)
```

- `Provisioner` produces a fully populated `PipelineContext`
- `Workflow` sequences all user-defined jobs serially
- Any job failure = hard stop, remaining jobs do not run
- `Teardown` always runs via `finally`, even on failure

---

## Workspace & Repo Sharing

- `Provisioner` creates a run directory: `/tmp/ci-runs/<run-id>`
- Repo is cloned into a subdirectory named after the repo, derived from the repo URL
- A separate `artifacts` directory is created alongside for job outputs
- Each job's Docker container gets the workspace **bind-mounted** at a consistent path (e.g. `/workspace`)
- Jobs share the same directory — no per-job copying
- Jobs may read or write freely; isolation is not enforced at the filesystem level
- The workspace is **ephemeral per run** — fresh clone every time

Workspace structure on the host:

```
/tmp/ci-runs/<run-id>/
  <repo-name>/       ← cloned repo, bind-mounted as /workspace/<repo-name>
  artifacts/         ← job outputs, bind-mounted as /workspace/artifacts
```

Jobs write artifacts to `/workspace/artifacts` by convention — since it's bind-mounted, files land on the host automatically. No explicit copy step needed.

> This is similar to how CircleCI handles workspaces: clone once, mount, accept that jobs can mutate it.

---

## Interfaces

### Lifecycle

Resource management — anything that can be started and stopped:

```typescript
interface Lifecycle<TStart = void, TStop = void> {
  start(): Promise<TStart>
  stop(): Promise<TStop>
}
```

Generic type parameters keep it flexible — `Promise<void>` would be too rigid. `DockerExecutor` uses `Lifecycle<string>` where `start()` returns the container ID.

### Executor

Pure capability — "I can run commands":

```typescript
interface Executor {
  exec(cmd: string[]): Promise<ExecResult>
}
```

### DockerExecutor

Implements both interfaces. One instance per job — each job declares its own image:

```typescript
class DockerExecutor implements Lifecycle<string>, Executor {
  // start(): starts container, returns container ID
  // stop(): stops and removes container
  // exec(): runs a command inside the running container
}
```

Consumer visibility:

```
Workflow → Lifecycle & Executor  (manages start/stop, delegates exec to Job)
Job      → Executor              (just needs exec, no lifecycle knowledge)
```

The `Executor` interface also provides a seam for a `DryRunExecutor` for testing jobs without Docker.

---

## Logging

Each job gets its own scoped `Logger` instance, created by `Workflow`:

```typescript
interface Logger {
  log(message: string): void
}
```

`Workflow` decides the implementation (e.g. file logger, stdout logger) and configuration (e.g. output path). `Job` just depends on the `Logger` interface and doesn't care where output goes.

---

## Event Emission

The event emitter is injected into `Workflow` by `Runner`. `Workflow` passes it down to each `Job`. Neither `Workflow` nor `Job` owns the emitter or knows who is listening.

---

## Design Notes & Warnings

### Workflow complexity

`Workflow` is the busiest thing in the system — it creates executors, creates loggers, sequences jobs, enforces hard-stop, and passes the event emitter down. It's not a god object, but worth watching as you implement it.

If it starts feeling like it knows too much, there's a natural extraction waiting: a `JobRunner` that owns the per-job loop (create executor, create logger, run job, teardown) while `Workflow` just calls `jobRunner.run(job, ctx)` for each job. Don't pre-empt it — you'll feel it when it's needed.

---

## Open Questions / Future Work

- **Artifact handling**: Convention-based for now (write to `/workspace/artifacts`). No first-class artifact API.
- **Run ID**: How pipeline runs are identified and namespaced (used for workspace paths, logs, etc.)
- **Trigger mechanism**: How `Runner` is notified of a new run (webhook, polling, manual, etc.)
- **ExecResult shape**: stdout/stderr as streams, exit code as a promise — needs formalising.
