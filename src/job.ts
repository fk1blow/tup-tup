import mergeStreams from '@sindresorhus/merge-streams'
import type EventEmitter from 'node:events'
import { Readable } from 'node:stream'
import type { CommandRunner, CommandRunnerResult } from './command-runner.types'
import type { JobCommandResult, JobDefinition, JobEventMap } from './job.types'
import { JobDefinition as JobDefinitionParser } from './job.types'

export class Job {
  constructor(
    private job: JobDefinition,
    private events: EventEmitter<JobEventMap>,
    private logger: WritableStream<Uint8Array>,
    private runner: CommandRunner,
  ) {
    const { success, error } = JobDefinitionParser.safeParse(job)
    if (!success) {
      throw new Error(`Invalid job definition: ${error.message}`)
    }
  }

  async run() {
    let jobSucceeded = true

    this.events.emit('job:started', { jobName: this.job.name })

    for (const [commandIndex, command] of this.job.commands.entries()) {
      this.events.emit('command:started', {
        jobName: this.job.name,
        commandIndex,
      })

      const runCommandResult = await this.runCommand(command)

      this.events.emit('command:finished', {
        jobName: this.job.name,
        commandIndex,
        result: runCommandResult,
      })

      if (runCommandResult.exitCode > 0) {
        jobSucceeded = false
        break
      }
    }

    this.events.emit('job:finished', {
      jobName: this.job.name,
      success: jobSucceeded,
    })
  }

  private async runCommand(cmd: string[]): Promise<JobCommandResult> {
    const execResult = await this.runner.exec(cmd)

    await this.pipeToLogging({
      stdout: execResult.stdout,
      stderr: execResult.stderr,
    })

    const exitCode = await execResult.exited

    // 1-127 = process faild
    // 128+ = killed by signal (128 + signal number)
    return { exitCode }
  }

  private async pipeToLogging({
    stdout,
    stderr,
  }: Pick<CommandRunnerResult, 'stdout' | 'stderr'>) {
    // TODO see the performance penalty of this conversion and consider alternatives if it's significant
    // Convert web streams to Node.js streams for merging
    // See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
    const nodeStdout = Readable.fromWeb(stdout)
    const nodeStderr = Readable.fromWeb(stderr)

    // Merge the 2 streams and convert back to a web stream for piping to the output
    const merged: ReadableStream<Uint8Array> = Readable.toWeb(
      mergeStreams([nodeStdout, nodeStderr]),
    )

    await merged.pipeTo(this.logger, { preventClose: true })
  }
}
