# Workflow

Sequences and runs user-defined jobs. Receives the fully populated PipelineContext from Provisioner via Runner:
- Depends on both Lifecycle and Executor — manages container lifecycle and delegates execution
- Creates one DockerExecutor per job, calls start()/stop() around each job
- Instantiates a scoped Logger per job
- Injects the event emitter (received from Runner) into each job
- Enforces the hard-stop rule on job failure
