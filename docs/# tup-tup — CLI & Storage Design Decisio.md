# tup-tup — CLI & Storage Design Decisions

## CLI

### Command signature

tup-tup  -b  [--data-dir ]

- `repo` — positional argument, the repository URL to clone and run pipelines
against
- `-b, --branch` — the branch to check out
- `--data-dir` — optional path to the persistent data directory (see resolution
order below)

### Data dir resolution order

1. `--data-dir` flag (explicit, highest priority)
2. `TUP_TUP_DATA_DIR` environment variable
3. `~/.tup-tup` (default fallback)

### Ephemeral workspace

The runner clones and builds inside `/tmp/tup-tup/<run-id>`. This is not
configurable — the OS owns `/tmp` and the runner scopes its workspace by run ID to
  avoid collisions between concurrent runs.

---

## dataDir structure

The `dataDir` is the runner's persistent home. All long-term state lives here.

~/.tup-tup/                        ← default dataDir
  runs/
    /
      metadata.json                ← structured run data (status, timestamps,
jobs, etc.)
      logs/                        ← build and step output
      artifacts/                   ← outputs produced by the pipeline

### metadata.json

Contains structured data about the run — intended to be read by both the CLI
(table display) and the future web app. Designed for fast loading across many runs
  (e.g. last 10 runs query).

```json
{
  "id": "<run-id>",
  "repo": "https://github.com/...",
  "branch": "main",
  "commit": "a1b2c3d4e5f6...",
  "status": "failed",
  "startedAt": "2026-03-20T10:00:00Z",
  "finishedAt": "2026-03-20T10:03:42Z",
  "jobs": [
    { "name": "lint", "status": "success", "duration": 12400 },
    { "name": "test", "status": "failed", "duration": 45200, "error": "Exit code
1" },
    { "name": "build", "status": "skipped", "reason": "dependency_failed" }
  ]
}

logs/

Raw output from the pipeline execution — per step or per job. Only read when
drilling into a specific run, not loaded for list views.

artifacts/

Outputs produced by the pipeline (binaries, reports, etc.). Kept for as long as
the run directory exists.

---
Summary of path responsibilities
Path: /tmp/tup-tup/<run-id>
Lifecycle: Ephemeral — deleted after run
Purpose: Clone, build, execute
────────────────────────────────────────
Path: <dataDir>/runs/<run-id>/metadata.json
Lifecycle: Persistent
Purpose: Run stats, status, timing, job results
────────────────────────────────────────
Path: <dataDir>/runs/<run-id>/logs/
Lifecycle: Persistent
Purpose: Build output for debugging
────────────────────────────────────────
Path: <dataDir>/runs/<run-id>/artifacts/
Lifecycle: Persistent
Purpose: Pipeline-produced outputs
---
Display layer (future)

Two consumers of dataDir are planned:

- CLI — human-readable formatted output (e.g. table of last N runs), powered by
https://github.com/RtlZeroMemory/Rezi TUI framework (Bun-compatible)
- Web app — lightweight UI surfacing the same data

Both read from metadata.json for list views and logs/ for drill-down.

---

Added `runs/` subdirectory and job-level detail with `status`, `duration`,
`error`, and `reason` for skipped jobs.