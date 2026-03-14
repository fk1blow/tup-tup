import type EventEmitter from 'node:events'
import type { Executor } from '../src/executor'
import type {
  JobCommandResult,
  JobDefinition,
  JobEventMap,
} from '../src/job.types'
import { JobDefinition as JobDefinitionParser } from '../src/job.types'
import type { JobReporter } from './job-reporter'
import type { Logger } from './logger'

export class Job {
  private definition: JobDefinition
  private reporter: JobReporter
  private logger: Logger
  private executor: Executor

  constructor(opts: {
    definition: JobDefinition
    reporter: JobReporter
    logger: Logger
    executor: Executor
  }) {
    const { definition, reporter, logger, executor } = opts
    this.definition = definition
    this.reporter = reporter
    this.logger = logger
    this.executor = executor

    const { success, error } = JobDefinitionParser.safeParse(opts.definition)
    if (!success) {
      throw new Error(`Invalid job definition: ${error.message}`)
    }
  }

  async run() {
    let jobSucceeded = true

    // this.reporter.emit('job:started', { jobName: this.definition.name })
    this.reporter.onJobStarted({ jobName: this.definition.name })

    for (const [commandIndex, command] of this.definition.commands.entries()) {
      // this.reporter.emit('command:started', {
      //   jobName: this.definition.name,
      //   commandIndex,
      // })
      this.reporter.onCommandStarted({
        jobName: this.definition.name,
        commandIndex,
      })

      const runCommandResult = await this.runCommand(command)

      // this.reporter.emit('command:finished', {
      //   jobName: this.definition.name,
      //   commandIndex,
      //   result: runCommandResult,
      // })
      this.reporter.onCommandFinished({
        jobName: this.definition.name,
        commandIndex,
        result: runCommandResult,
      })

      if (runCommandResult.exitCode > 0) {
        jobSucceeded = false
        break
      }
    }

    // this.reporter.emit('job:finished', {
    //   jobName: this.definition.name,
    //   success: jobSucceeded,
    // })
    this.reporter.onJobFinished({
      jobName: this.definition.name,
      success: jobSucceeded,
    })
  }

  private async runCommand(cmd: string[]): Promise<JobCommandResult> {
    const execResult = await this.executor.exec(cmd)

    await this.logger.pipe(execResult.stdout, execResult.stderr)

    const exitCode = await execResult.exited

    // 1-127 = process faild
    // 128+ = killed by signal (128 + signal number)
    return { exitCode }
  }
}
