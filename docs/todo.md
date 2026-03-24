# TODO
- [ ] pipeline scheduler job timeout
- [ ] runner container and communication
- [ ] restricty containers with [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)
- [ ] system logs (see phases below)
- [ ] handle multiple runners(TBD)

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

__Interaction model__
```
CLI  ──HTTP──►  Server  ──reads/writes──►  File System
                  │
                  └──spawns──►  Runner  ──writes──►  events.log + logs/
```

| CLI command | Server endpoint | Description |
|-------------|-----------------|-------------|
| `tup-tup run <repo>` | `POST /runs` | trigger a new run |
| `tup-tup list` | `GET /runs` | list previous runs |
| `tup-tup status <id>` | `GET /runs/:id` | current state of a run |
| `tup-tup logs <id> <job>` | `GET /runs/:id/logs/:job` | raw job output |
| `tup-tup tail <id>` | `GET /runs/:id/events` | SSE stream of events |

---

### Phase 1: Event logging foundation
- [ ] define event types (`run:started`, `job:started`, `job:settled`, `job:skipped`, `run:completed`)
- [ ] create EventLogger that appends JSON lines to `events.log`
- [ ] Runner consumes PipelineScheduler events and writes them via EventLogger

### Phase 2: Server reads events
- [ ] `GET /runs` — scan all `runs/*/events.log`, return summaries
- [ ] `GET /runs/:id` — parse `events.log`, derive current state

### Phase 3: Real-time streaming
- [ ] `GET /runs/:id/events` — SSE endpoint that tails `events.log`
- [ ] CLI `tail` command connects to SSE and renders live updates
