# Workflow

Sequences and runs user-defined jobs. Receives the fully populated PipelineContext from Provisioner via Runner:
- Depends on both Lifecycle and Executor — manages container lifecycle and delegates execution
- Creates one DockerExecutor per job, calls start()/stop() around each job
- Instantiates a scoped Logger per job
- Injects the event emitter (received from Runner) into each job
- Enforces the hard-stop rule on job failure

## Handling failed job

The jobs are being ran inside a loop, but when a job finishes, the only way to
see what happened is if the Workflow catches the emitted event.

This isn't working, so we need to rethink the whole aproach.

## Parallel jobs

- get the jobs list
- find the jobs that don't have a dependency
- start all of them inside a Promise.race
- when one job finishes, get jobs that depend on this one
  - update the list of running jobs
- restart the loop

```
while there are pending or running job
  wait for any job to finish
  mark it complete
  check what's now unblocked()
```
