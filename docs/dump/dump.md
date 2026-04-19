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

## 04/13

WHO   registery  
WHAT  persist job logs
HOW
WHY
NEXT
?
