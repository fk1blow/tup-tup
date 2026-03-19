import type { Executor } from '../src/executor'
import type { JobDefinition } from '../src/job.types'
import { JobDefinition as JobDefinitionParser } from '../src/job.types'
import type { Logger } from './logger'

export class Job {
  private definition: JobDefinition
  private logger: Logger
  private executor: Executor

  constructor(opts: {
    definition: JobDefinition
    logger: Logger
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

    for (const [_, command] of this.definition.commands.entries()) {
      const runCommandResult = await this.runCommand(command)

      if (runCommandResult.exitCode > 0) {
        jobSucceeded = false
        break
      }
    }

    return Promise.resolve([jobSucceeded, this.definition] as [
      boolean,
      JobDefinition,
    ])
  }

  private async runCommand(cmd: string[]): Promise<{
    exitCode: number
  }> {
    const execResult = await this.executor.exec(cmd)

    await this.logger.pipe(execResult.stdout, execResult.stderr)

    const exitCode = await execResult.exited

    // 1-127 = process faild
    // 128+ = killed by signal (128 + signal number)
    return { exitCode }
  }
}
