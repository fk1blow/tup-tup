# Docker Runtime

This is a runtime for commands that will run inside a docker container

## TODO

- use a logger, inject it(see Job)
- could also emit events similar to how Job emits
- start() returns { containerId, warnings?: string[] } instead of void
