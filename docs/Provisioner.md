# Provisioner

Owns the entire "get ready" phase. By the time it's done, PipelineContext is fully populated and everything downstream needs is available:

Creates the run workspace directory
Clones the repo
Finds and parses the pipeline config YAML
Derives all paths (workspace, repo, artifacts)

Produces a fully populated PipelineContext — no partial state leaks into Workflow.
May have additional sub-responsibilities discovered during implementation.

## Using docker to clone

I suppose that theres no real benefit in using docker at this level, theres no
real benefit in isolating just for the sake of doing it. Isolating it from what?

## TODO

- [x] create the `./artifacts`, `./repo` directories
- [x] ~~clone the repo~~
- [x] clone the repo(without using docker)
- [x] finds and parse the pipeline config
- [x] add more tests
- [ ] produce the PipelineContext(or ProvisionContext)
