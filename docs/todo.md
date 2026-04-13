# TODO
- [ ] refactor the provisioner(progressive)
- [ ] integrate logger
- [ ] side effects and services
- [ ] event log and runner state

## overview

This would progress while developing the other parts(eg: logging) so that
the interface evolves naturally and gradually.

### provisioner
- download the config file from the repo
- parse and validate the config file
- enhance and expand each job actions
  - parse all the commands
  - extract the ones that being with `actions.`
- extract env variables
  - repository_url
  - repository_branch
  - checkout_service_endpoint
  - logs_service_endpoint
  - artifacts_service_endpoint

## integrate logger
need to be able to catch logs of a running container

~~inside the job's `runCommand()`, merge the subprocess' stdout/stderr, and send
them to the logger service~~
This is handled by the executor itself, not the job's responsability!
