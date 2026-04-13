## 04/12

WHO   pipeline definition
WHAT  how to describe artifacts in terms of `inputs` and `outputs`
HOW   how artifacts are being mapped
  .   each jobs specify `input` and `output`
  .   `inputs` need to specify the path where an artifact will be copied to
```yaml
artifacts:
  - coverage-unit
  - coverage-integration

jobs:
  test-unit:
    outputs:
      - coverage-unit: "coverage.xml"

  test-integration:
    outputs:
      - coverage-integration: "coverage.xml"

  report:
    inputs:
      - coverage-unit: "coverage.xml"
      - coverage-integration: "coverage-integration.xml"
```


WHO   PipelineScheduler
  .   specialized docker container for persistence
WHAT  handle artifacts from one job to another 
HOW   it uses a docker volume with ephemeral storage
  .   it's prepared by the Runner
  .   it happens inside the PipelineScheduler
WHY   the only logical place rn is the scheduler 
  .   the jobs and executors are there
  .   isolation through ephemeral docker volume
NEXT  how do i send an artifact from a machine to another
NEXT  i can use a specific Job that does an rsync

## 04/13

WHO   logger  
WHAT  
HOW
WHY
NEXT
