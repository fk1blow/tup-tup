# TODO
- [ ] refactor logger, executor interfaces
- [ ] pipeline scheduler job timeout
- [ ] runner container and communication
- [ ] restricty containers with [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)
- [ ] system logs (see phases below)
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
