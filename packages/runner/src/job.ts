import type { Executor } from '../src/executor'
import type { JobDefinition, JobName } from '../src/job.types'

export class Job {
  private definition: JobDefinition
  private executor: Executor

  constructor(opts: {
    definition: JobDefinition
    executor: Executor
  }) {
    const { definition, executor } = opts

    this.definition = definition
    this.executor = executor
  }

  async prepare() {
    // TODO use this inside the job scheduler to prepare the job for execution
    // start the docker executor
    // also could throw if the exeucotor fails to start or something else
    // inside the executor implementation
  }

  async run() {
    let jobSucceeded = true

    for (const [_, command] of this.definition.steps.entries()) {
      const exitCode = await this.runCommand(command)

      if (exitCode !== null && exitCode > 0) {
        jobSucceeded = false
        return Promise.resolve([
          jobSucceeded,
          // TODO use Error subclasses
          this.definition.name,
          new Error(`Step failed with exit code + ${exitCode}`),
        ] as [boolean, JobName, Error])
        break
      }
    }

    // TODO need to return errors as well
    // StepFailed
    // OutputMissing
    // InputMissing
    return Promise.resolve([jobSucceeded, this.definition.name] as [
      boolean,
      JobName,
    ])
  }

  async abort() {
    await this.executor.kill()
  }

  private async runCommand(cmd: string[]) {
    const subprocess = await this.executor.exec(cmd)

    // TODO this would/should move to the executor itself
    // await this.logger.pipe(subprocess.stdout, subprocess.stderr)

    // 1-127 = process faild
    // 128+ = killed by signal (128 + signal number)
    return await subprocess.exitCode
  }
}
