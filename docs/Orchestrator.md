# Orchestrator

The orchestrator's main responsability is to manage the pipeline, to prepare
each job's runtime, then to delegate work to each job, serially.

- Runtime: the Docker container lifecycle (orchestrator's responsibility to setup/teardown)
- Runner: the exec capability that runtime exposes (job's dependency)

## Lifecycle

- receive trigger event(webhook, tbd)
- prepare the workspace
  - create folder for this run(timestamp?)
- clone the repo(need this from above)
- find and parse the pipeline config(yml)
  - need to store this(tbd)
- run the pipeline's jobs
- cleanup task

## Full Lifecycle(outdate)

- receive the pipeline's definition
  - needs the repo (github) url
  - parses it
- (loops through each job)
- create the job
- start/setup the runtime
  - runs the job's image
  - clones the repo
- runs the job
  - exec into the provided runner
  - get through each command
- on success -> next job
- on error -> stop pipeline, teardown runtime
- go to next job
- on finished
  - stops/teardown the runtime
