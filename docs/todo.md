# TODO
- [x] refactor logger, executor interfaces
- [x] pipeline scheduler job timeout
- [ ] Job isolation and artifacts
- [ ] runner lifecycle, teardown
- [ ] runner container and communication
- [ ] restrict containers with [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)
- [ ] system logs (see phases below)
  - might have to rethink this
- [ ] handle multiple runners(TBD)

## refactor logger, executor interfaces

__see TODOs inside file file-logger.ts, executor.ts__

- EventsLogger — new, simple push-based class
- FileLogger → JobsLogger — rename
- Logger interface — probably delete or rethink
- ExecResult — slim down to streams + exit code
- ExecutorFactoryOpts — delete, let factories define their own
- ExecutorFactory<TOpts> — generic over options

## pipeline scheduler job timeout
Could use the same aproach as the running jobs: have a race between the job's promise
and a timeout.

### Failure continuation (two orthogonal decisions)
When a job fails (including timeout):

1. **Dependency continuation** — can jobs that depend on the failed job still run?
2. **Pipeline continuation** — can unrelated jobs (no dependency) continue?

Naming options:
- `allowFailure` / `continueOnError` — on the failing job ("my failure shouldn't block others")
- `runOnFailure` / `when: always` — on the dependent job ("run me regardless of upstream status")

TBD: which perspective feels more natural for pipeline definitions?

## Job isolation and artifacts

### Approach: GitHub Actions-style (explicit checkout)

Each job is fully self-contained and handles its own source checkout. Isolation comes naturally — each container has its own filesystem, no shared state.

**Why this over provisioner-clones-once:**
- Simpler architecture — no copy step, no workspace isolation dance
- Jobs are independent — can run different repos, branches, or skip checkout entirely
- Follows established patterns (GitHub Actions)

### Structure
```
/tmp/tuptup/<runId>/
  artifacts/
    <job-name>/
      dist/
      coverage/
  logs/
    <job-name>.log
```

Provisioner becomes minimal — just sets up directory structure, no git clone.

### Environment variables (injected by Runner)

Runner receives trigger (webhook, CLI) with repo info, injects into every job container:
```
TUPTUP_REPO=https://github.com/user/repo
TUPTUP_BRANCH=main
TUPTUP_SHA=abc123
```

Jobs use them explicitly:
```yaml
jobs:
  - name: build
    image: oven/bun:1.3.7
    commands:
      - ["git", "clone", "--branch", "$TUPTUP_BRANCH", "--single-branch", "$TUPTUP_REPO", "."]
      - ["bun", "install"]
      - ["bun", "run", "build"]
    artifacts:
      - ./dist
```

### Artifacts via bind mounts

Job definition declares artifact paths:
```yaml
artifacts:
  - ./dist
  - ./coverage
```

DockerExecutor mounts these paths to the artifacts directory:
```
-v /tmp/tuptup/<runId>/artifacts/<job-name>/dist:/app/dist
-v /tmp/tuptup/<runId>/artifacts/<job-name>/coverage:/app/coverage
```

Job writes to `./dist` as normal → appears directly in artifacts folder.

### Schema changes

**JobDefinition:**
```ts
artifacts: z.array(z.string()).optional()  // paths relative to working dir
```

**RuntimeContext** (or equivalent) needs:
```ts
repository: {
  url: string
  branch?: string
  sha?: string
}
```

### Changes required

**Provisioner**
- Remove git clone logic
- Just create directory structure: `artifacts/`, `logs/`

**DockerExecutor**
- Constructor accepts `artifacts?: string[]` and `env?: Record<string, string>`
- `start()` creates artifact directories and builds `-v` mount flags
- `start()` passes `-e` flags for environment variables

**Runner.start()**
- Build env vars from trigger context: `TUPTUP_REPO`, `TUPTUP_BRANCH`, `TUPTUP_SHA`
- Pass to executor factory

**dockerExecutorFactory signature**
```ts
dockerExecutorFactory: (opts: {
  image: string
  name: string
  workspacePath: string
  artifacts?: string[]
  env?: Record<string, string>
}) => DockerExecutor
```

### Notes
- No workspace mount needed anymore — container filesystem is the workspace
- Working directory is `/app` (or wherever job clones to)
- Missing artifacts: directory stays empty — check job logs
- Future: could provide a reusable "checkout" action/script to reduce boilerplate

## runner lifecycle, teardown
Should define what does the teardown involves, what needs to be done after the scheduler finishes.
Might also look at the test files to see what's being done.

### Docker container labeling for cleanup
Label containers at creation time with the run ID, then filter on teardown.

**When creating containers (DockerExecutor):**
```bash
docker run --label tuptup.run=<runId> --label tuptup.job=<jobName> ...
```

**On teardown:**
```bash
# Stop and remove containers for this run
docker rm -f $(docker ps -aq --filter label=tuptup.run=<runId>)

# Optionally prune images (if using per-run images)
docker image prune --filter label=tuptup.run=<runId>
```

**Considerations:**
- DockerExecutor needs access to `runId` (pass via RuntimeContext or constructor)
- Graceful stop with timeout before force kill: `docker stop -t 10 <container> && docker rm <container>`
- Decide if images should be labeled/pruned or kept for caching

## handle multiple runners
This thing could be a queue of runners, TBD
It would also need another? abstraction, like a controller or something, that would
manage the queue and the runners themselves.

## runner container and communication
- executor start should be done via `/var/run/docker.sock` the docker deamon implicitly
- see the root docker.compose.yml

## system logs
- see a list of previous runs, pipeline's name, when and how long it ran
- each job should have its own log file so i can grep it
- realtime pipeline stats: which jobs are running, settled, skipped

```
runs/<runId>/
  events.log          # structured event stream (source of truth)
  logs/
    <job-name>.log    # raw container output per job
```

### Event logging foundation
- [ ] define event types (`run:started`, `job:started`, `job:settled`, `job:skipped`, `run:completed`)
- [ ] create EventLogger that appends JSON lines to `events.log`
- [ ] Runner consumes PipelineScheduler events and writes them via EventLogger

### Server reads events
- [ ] `GET /runs` — scan all `runs/*/events.log`, return summaries
- [ ] `GET /runs/:id` — parse `events.log`, derive current state

### Real-time streaming
- [ ] `GET /runs/:id/events` — SSE endpoint that tails `events.log`
- [ ] CLI `tail` command connects to SSE and renders live updates

### Testing
- [ ] test the Runner(starts, produces logs, teardown)
- [ ] test the PipelineScheduler(produces/returns stream of `PipelineEvent`)
