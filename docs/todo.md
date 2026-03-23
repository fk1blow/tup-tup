# TODO
- [ ] pipeline scheduler job timeout
- [ ] runner container and communication
- [ ] restricty containers with [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)
- [ ] system logs vs job logs

## pipeline scheduler job timeout

## runner container and communication
- executor start should be done via `/var/run/docker.sock` the docker deamon implicitly
- see the root docker.compose.yml

## system logs vs job logs
- have a system log written by the runner or the scheduler
- it should include stuff like the...
