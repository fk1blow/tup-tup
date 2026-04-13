# about
The core change is isolating the runner and its component from the target machine.
There are no side effects like directories created(rather implicitly sometimes),
no files like the job or event logs, nothing.

The side effects are handled by services, which are http endpoints called by the system.
Example of essential service is the job logs, or the artifacts creation.

```yml
name: my-pipeline
jobs:
  - name: build
  image: oven/bun:1.3.7
  steps:
    - action: checkout
    - run: bun install
    - run: ["bun", "build"]
    - action: artifact
    paths: [dist/]
    ```

## services
A service is the layer which provides ways of interacting with the outside world.
Jobs need to log, clone a repository, build artifacts or(then) read them, etc
and they're consumers of a service.

## provisioner
The Provisioner's role is to prepare the pipeline's environment, to find and prepare
all the necessary data for a pipeline's run.

- repository url and branch
- find job's actions and expand them
- setup vars needed for service interaction(through `add_host`)

## job
Logging goes implicitly to the "Executor", it just logs everything to the loggigng
service, which is a completely different thing than job's actions

The job stays almost the same, all it has to do is to run its commands in the executor,
but with a small twist: it has "before" commands, its old and regular "commands",
and the "after" commands.
