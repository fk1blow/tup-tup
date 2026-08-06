# Design Persistence Layer Document

## Goals & Constraints

- Runner is isolated from the host via Docker
- Minimal configuration — users should never think about directories, paths, or storage
- **No host filesystem bind mounts** — no paths on the host machine are ever required or exposed
- Jobs run inside their own Docker containers
- Stack: Bun

---

## Architecture

```
Runner process (long-lived Docker container)
├── Scheduler    — constructs and sequences Jobs, observes completion
└── HTTP server  — external-facing, handles run triggers and status queries
```

Component interactions:

```
HTTP server    → Scheduler          (trigger a run)
Scheduler      → Job                (construct with injected deps, sequence, observe)
Job            → Executor           (spawn container, run commands)
Job            → ArtifactStore      (read inputs before commands, write outputs after)
```

The Runner container is **long-lived** — starts once, handles many runs over its lifetime. The ephemeral part is the job environment, not the runner itself.

---

## Key Design Decisions

### No host bind mounts — named Docker volumes only

The runner never touches the host filesystem. All file exchange between the runner and job containers happens through a **named Docker volume** created per run. The runner container and job containers both mount this volume at a known path. This means:

- Users don't need to configure or expose any host directories
- The runner stays fully self-contained inside Docker
- Cleanup is just removing the volume after the pipeline finishes

### Artifacts are files on the shared volume (v1)

Artifacts are files on a well-known path on the shared volume. Job A's outputs are written there; Job B's inputs are read from there.

The Job reads and writes artifacts through a small `ArtifactStore` interface (e.g. `putOutput(jobName, artifactName, srcPathInContainer)`, `getInput(producingJobName, artifactName, destPathInContainer)`). The v1 implementation is `VolumeArtifactStore`.

### How `VolumeArtifactStore` copies files

Both the runner and the job container mount the same named volume at `/workspace`. `VolumeArtifactStore` performs copies by having the runner `docker exec` into the job container:

- **Before commands run (inputs):** `docker exec <job> cp /workspace/artifacts/<producing-job>/<artifact-name> <declared-input-path>`
- **After commands succeed (outputs):** `docker exec <job> cp <declared-output-path> /workspace/artifacts/<this-job>/<artifact-name>`

The job's image is oblivious to the artifact system — it just finds its inputs where it declared them and writes its outputs where it declared them.

### Execution order is inferred from artifact flow

The scheduler derives the execution DAG from `inputs` and `outputs`. If job B declares an input of artifact `X` and job A declares an output of artifact `X`, then there is an implicit edge A → B — B will not start until A completes successfully.

`dependsOn` is still available as an **optional, additive** override for ordering without data flow (e.g. "don't run smoke-test until deploy finishes, but deploy produces nothing smoke-test reads"). Explicit `dependsOn` entries are unioned with the inferred edges; they never remove an inferred edge.

### Job owns its full lifecycle

The Job is the active unit of execution. It knows its definition, and is responsible for:

1. Orchestrating input copies into the job container before commands run
2. Running commands sequentially via the Executor
3. Piping stdout/stderr to the Logger
4. Orchestrating output copies out of the job container after commands complete

### Failures: validation-time vs. runtime

Several failure modes are caught at pipeline validation, before any job runs:

- An input references an artifact name no job produces
- Two jobs declare the same artifact as an output
- Two jobs with the same name (already enforced by `PipelineDefinition`)
- `dependsOn` references an unknown job, or introduces a cycle (combined with inferred edges)

At runtime, a job can fail in one of three kinds. All three result in the same outcome for the scheduler — the job is marked not-successful, downstream jobs are skipped — but they are surfaced as **distinct kinds** in the `JobSettled` event and in logs. The split is **user-space vs. runner-space** because each kind sends the user to a different place:

| Kind | Space | When | Meaning | What the user should do |
|---|---|---|---|---|
| `StepFailed` | user | During steps | A step's command exited non-zero (or was killed by signal — exit code 128+). | Read the command output, fix the code. |
| `OutputMissing` | user | After steps exit 0 | A declared `outputs` file does not exist in the job container at the declared path. | Check that the step's commands actually write the file where the pipeline declared it. |
| `RunnerError` | runner | Any time | The runner itself could not bring the job to a point where its success or failure was meaningful. | Not the user's code; check infra (daemon, disk, image registry) or file a bug. |

`RunnerError` has subkinds, carried as a discriminator on the error:

- `ImagePull` / `ContainerStart` — today's `executor.start()` throw path (bad image, daemon unreachable, permission denied on socket)
- `Timeout` — today's timeout race
- `InputMissing` — a declared input's source file is absent from the shared volume. Unreachable if validation passed and the upstream producer's `OutputMissing` check fired correctly; nested under `RunnerError` because when it does fire, it's a runner invariant violation, not something the user can fix in their pipeline.
- `Internal` — any other unexpected throw inside the runner (logger failures, filesystem errors on the volume)

Each failure carries structured context on `JobSettled`:

- `StepFailed` — `command: string[]`, `exitCode: number`
- `OutputMissing` — `artifact: string`, `declaredPath: string`
- `RunnerError` — `subkind`, plus subkind-specific fields (e.g. `artifact` and `producingJob` for `InputMissing`, `timeoutMs` for `Timeout`)

The step loop semantics in `Job.run()` don't change: steps run sequentially, the first non-zero exit stops the loop. `allowFailure` (already in `JobDefinition` but unused by the scheduler) remains a future consideration — when wired, it should gate `StepFailed` only, not `OutputMissing` or `RunnerError`, which represent broken contracts rather than expected failures.

### Scheduler is thin

The scheduler sequences Jobs according to the inferred-plus-explicit DAG and observes exit outcomes. It constructs Jobs with the dependencies they need but has no knowledge of artifact layout or log streaming. Those are Job concerns.

### Volume lifecycle

One named Docker volume is created per run at run start and destroyed after the pipeline finishes (success or failure). Volume names are scoped to the run ID to avoid conflicts between concurrent runs.

---

## Shared Volume

### Mount layout

The runner container has the run volume mounted at a fixed internal path:

```
/workspace/          ← volume root, mounted into runner and all job containers
  artifacts/
    <job-name>/
      <artifact-name>   ← file written by producing job, read by consuming job
  app/                  ← job working directory (commands run here)
```

The runner mounts the volume into job containers at the same `/workspace` path. Jobs always find their working directory at `/workspace/app` and artifacts at `/workspace/artifacts/<job-name>/<artifact-name>`.

### Runner container mounts

| Mount | Container path | Purpose |
|-------|---------------|---------|
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker daemon access |
| Named volume (per run) | `/workspace` | Shared artifact and workspace storage |

The Docker socket is the only host resource the runner requires — no host filesystem paths are ever mounted.

#### Why the Docker socket

The runner spawns and manages job containers by shelling out to the Docker CLI via `Bun.spawn(['docker', 'run', ...])`, `Bun.spawn(['docker', 'exec', ...])`, etc. These CLI calls rely on the Docker socket to reach the host daemon. Without it, the runner container has no way to create or manage other containers.

This is a deliberate tradeoff: mounting the socket gives the runner container effective Docker daemon access, which is root-equivalent on the host. It's the standard pattern for containerized CI runners (Buildkite, Drone, act) and the only practical way to keep the runner itself containerized while still spawning job containers.

---

## Pipeline Definition

Pipelines are declared in `.tuptup.yml`. Jobs declare what they produce (`outputs`) and what they need (`inputs`); artifact names are logical identifiers that wire producers to consumers.

```yaml
name: my-pipeline

jobs:
  - name: test-unit
    image: node:20
    steps:
      - [bun, test]
    outputs:
      coverage-unit: coverage.xml

  - name: test-integration
    image: node:20
    steps:
      - [bun, test:integration]
    outputs:
      coverage-integration: coverage.xml

  - name: report
    image: node:20
    steps:
      - [bun, coverage:merge]
    inputs:
      coverage-unit: coverage.xml
      coverage-integration: coverage-integration.xml
    outputs:
      coverage-summary: summary.json

  - name: notify
    image: alpine:3
    inputs:
      coverage-summary: /tmp/summary.json
    steps:
      - [apk, add, --no-cache, curl]
      - [sh, -c, "curl -X POST -H 'Content-Type: application/json' --data @/tmp/summary.json https://hooks.example.com/ci-done"]
```

`inputs` and `outputs` are name→path maps: key is the logical artifact name, value is the container-internal path. Intra-job uniqueness comes free from object keys; cross-job uniqueness (one producer per artifact) is enforced by the validator. If per-artifact metadata is needed later (`when: on_failure`, `optional: true`), the shape can widen to an array of objects behind a schema version bump.

Reading the DAG:

- `test-unit` and `test-integration` have no inputs, so they run immediately in parallel.
- `report` inputs `coverage-unit` and `coverage-integration`, so it waits for both test jobs.
- `notify` inputs `coverage-summary`, which `report` produces, so it waits for `report` (and transitively for the test jobs).

No `dependsOn` anywhere — every edge is an artifact edge. `dependsOn` would only be needed for a job like `cleanup` that must run after `notify` but consumes nothing from it.

---

## v2 / Future Considerations

- **Registry**: run/job metadata store (SQLite) — history, status, querying
- **Queue**: decouple run triggering from execution, enable distributed runners
- **Log compression**: per-run, after run completes
- **Artifact retention**: expiry, size limits, deduplication
- **HTTP-backed `ArtifactStore`**: swap in for cross-runner artifact sharing or persistence beyond the run. Pipeline YAML stays unchanged; the runner is configured with a different store implementation.
- **Conditional artifact capture**: analogous to GitLab's `when: always` / `when: on_failure`, for uploading debug output from failed jobs.

---

## Open Questions

- HTTP API shape (routes, request/response format)
- Events schema for structured log events (fields, types)
- How the runner gets the pipeline YAML (git clone into the volume? passed via HTTP body?)
