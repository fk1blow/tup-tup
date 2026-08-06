# TODO
- [x] update the pipeline definition
- [ ] refactor docker executor for shared volume
- [ ] create ArtifactStore interface and VolumeArtifactStore impl
- [ ] update the Job class
- [ ] ...

## refactor docker executor for shared volume
- receives the path to the job-name
  - `/workspace/artifacts/<job-name>`
- mounts it at `/container-workspace/artifacts`
- logging should start on executor's `start()`
  - capture all the container's logs, not just when it `execs`

## create ArtifactStore interface and VolumeArtifactStore impl
- define `saveArtifact()` and `getArtifact()` 
- the store already knows full path
  - could be `/workspace/artifacts/<job-name>/<artifact-name>`
  - don't need the `run-id`, volume's lifecycle is per run anyway

## update the Job class
- remove the logging functionality temporarely
- leave the job-scheduler as is for now
- refactor tests
