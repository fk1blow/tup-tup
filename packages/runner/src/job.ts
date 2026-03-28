import type { Executor } from '../src/executor'
import type { JobDefinition } from '../src/job.types'
import { JobDefinition as JobDefinitionParser } from '../src/job.types'
import type { JobsLogger } from './jobs-logger'

export class Job {
  private definition: JobDefinition
  private logger: JobsLogger
  private executor: Executor

  constructor(opts: {
    definition: JobDefinition
    logger: JobsLogger
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

  // Would be called when a job has timed out or when the runner receives a shutdown signal
  // TODO do i really want this here?
  async abort() {
    await this.executor.kill()
  }

  private async runCommand(cmd: string[]) {
    const subprocess = await this.executor.exec(cmd)

    await this.logger.pipe(subprocess.stdout, subprocess.stderr)

    // 1-127 = process faild
    // 128+ = killed by signal (128 + signal number)
    return await subprocess.exitCode
  }
}
