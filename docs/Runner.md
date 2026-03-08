# Runner

The top-level coordinator. Owns the full run lifecycle:

```
Runner
  → Provisioner   (prepare, clone, parseConfig — produces PipelineContext)
  → Workflow      (sequences jobs, owns executor/runner lifecycle per job)
  → Teardown      (cleanup — always runs via finally)
```

Wires in cross-cutting concerns: logging, event emission.

> `Runner` is what runs a pipeline. `Pipeline` is the thing being run — the parsed config and its data.
