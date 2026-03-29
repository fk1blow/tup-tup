# TODO
- [x] refactor logger, executor interfaces
- [x] pipeline scheduler job timeout
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
