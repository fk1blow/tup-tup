import type { Executor } from '../src/executor'
import type { JobDefinition } from '../src/job.types'
import { JobDefinition as JobDefinitionParser } from '../src/job.types'

export class Job {
  private definition: JobDefinition
  private executor: Executor
  private logger: {
    pipe: (...streams: ReadableStream[]) => Promise<void>
    close: () => Promise<void>
  }

  constructor(opts: {
    definition: JobDefinition
    logger: {
      pipe: (...streams: ReadableStream[]) => Promise<void>
      close: () => Promise<void>
    }
    executor: Executor
  }) {
    const { definition, logger, executor } = opts

    this.definition = definition
    this.logger = logger
    this.executor = executor

    const { success, error } = JobDefinitionParser.safeParse(opts.definition)
    if (!success) {
      throw new Error(`Invalid job definition: ${error.message}`)
    }
  }

  async run() {
    let jobSucceeded = true

    for (const [_, command] of this.definition.steps.entries()) {
      // TODO the `command`'s type
      const exitCode = await this.runCommand(command)

      if (exitCode !== null && exitCode > 0) {
        jobSucceeded = false
        break
      }
    }

    return Promise.resolve([jobSucceeded, this.definition] as [
      boolean,
      JobDefinition,
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
