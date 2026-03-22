# Runner Architecture

## Overview

The tup-tup runner runs inside a Docker container. A CLI on the host communicates with it via HTTP.

```
┌─────────┐           HTTP            ┌─────────────────────────┐
│   CLI   │  ──────────────────────►  │   Runner (container)    │
└─────────┘                           │                         │
  (host)                              │  - HTTP API             │
                                      │  - spawns job containers│
                                      │  - captures logs        │
                                      └───────────┬─────────────┘
                                                  │
                                                  ▼
                                      ┌─────────────────────────┐
                                      │   Job containers        │
                                      └─────────────────────────┘
```

## Why Containerized?

- Full isolation from host
- No pollution on home server
- Easy deploy/update (pull new image)
- Clean uninstall (remove container)
- Consistent runtime environment

---

## Runner Container

### Mounts

| Host | Container | Purpose |
|------|-----------|---------|
| `/var/run/docker.sock` | `/var/run/docker.sock` | Spawn job containers |
| `~/.tup-tup/runs` | `/app/runs` | Persist logs |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TUP_TUP_PORT` | `3000` | HTTP server port |
| `TUP_TUP_RUNS_PATH` | `/app/runs` | Where run data is stored |

### Running

```bash
docker compose up --build
```

---

## HTTP API

Simple REST API. CLI talks to `http://localhost:3000`.

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| `GET` | `/health` | — | `{ status: "ok" }` |
| `POST` | `/runs` | `{ repoUrl, branch? }` | `{ runId }` |
| `GET` | `/runs` | — | `[{ runId, status, ... }]` |
| `GET` | `/runs/:id` | — | `{ runId, status, jobs, ... }` |
| `GET` | `/runs/:id/logs/:job` | — | Plain text log |

---

## Storage

### What the Runner Stores

The runner only persists:

1. **Logs** — stdout/stderr per job
2. **Metadata** — run status, timing, job results (structured log)

That's it. No artifact management.

### Why No Artifact Management?

Artifacts are job-defined. Each job explicitly declares what to save and where via commands in the pipeline definition. The runner doesn't implicitly collect anything.

> Metadata is just a specialized log — structured information about what happened.

### Directory Structure

```
~/.tup-tup/runs/
  <run-id>/
    run.json        # structured run metadata (status, timing, jobs)
    job-a.log       # stdout/stderr from job-a
    job-b.log       # stdout/stderr from job-b
```

---

## CLI

The CLI is a thin HTTP client. Runs on the host, not in the container.

### Commands

```bash
tup-tup run <repo-url> [--branch <branch>]   # POST /runs
tup-tup list                                  # GET /runs
tup-tup status <run-id>                       # GET /runs/:id
tup-tup logs <run-id> <job>                   # GET /runs/:id/logs/:job
```

### Configuration

CLI needs to know where the runner is:

```bash
export TUP_TUP_RUNNER_URL=http://localhost:3000
```

Or pass via flag: `tup-tup --url http://192.168.1.x:3000 list`

---

## Pipeline Definition

Everything a job needs to do is declared in `.tuptup.yml`. The runner executes it; the pipeline defines it.

If a job needs to save artifacts, it runs a command to do so. No magic.

---

## Run ID

Sequential number. Simple, predictable.

---

## Files

```
Dockerfile           # Bun-based image
docker-compose.yml   # Local dev setup with mounts
src/server.ts        # HTTP server entry point
.dockerignore        # Keeps image clean
```
