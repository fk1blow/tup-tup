# Provisioner

Owns the entire "get ready" phase. By the time it's done, PipelineContext is fully populated and everything downstream needs is available:

Creates the run workspace directory
Clones the repo
Finds and parses the pipeline config YAML
Derives all paths (workspace, repo, artifacts)

Produces a fully populated PipelineContext — no partial state leaks into Workflow.
May have additional sub-responsibilities discovered during implementation.

## TODO

- [x] clone the repo
- [x] finds and parse the pipeline config
- [ ] create the `./artifacts` directory
- [ ] add more tests
- [ ] product teh PipelineContext(or ProvisionContext)
