import mergeStreams from '@sindresorhus/merge-streams'
import type { Subprocess } from 'bun'
import type EventEmitter from 'events'
import { Readable } from 'node:stream'
import type { JobCommandResult, JobDefinition, JobEventMap } from './job.types'

type JobSubprocess = Subprocess<'inherit', 'pipe', 'pipe'>

export class Job {
  // private job: JobDefinition

  constructor(
    private job: JobDefinition,
    private events: EventEmitter<JobEventMap>,
    private logger: WritableStream<Uint8Array>,
  ) {}

  async run() {
    let jobSucceeded = true

    this.events.emit('job:started', { jobName: this.job.name })

    for (const [commandIndex, command] of this.job.commands.entries()) {
      this.events.emit('command:started', {
        jobName: this.job.name,
        commandIndex,
      })

      const result = await this.runCommand(command)

      this.events.emit('command:finished', {
        jobName: this.job.name,
        commandIndex,
        result,
      })

      // Check if command failed and bail out
      const failed =
        result.type === 'FailedToStart' ||
        result.type === 'StreamError' ||
        result.type === 'Killed' ||
        (result.type === 'Exited' && result.exitCode !== 0)

      if (failed) {
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
    let subprocess: JobSubprocess

    try {
      subprocess = Bun.spawn(cmd, {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'pipe',
      })
    } catch (error) {
      return {
        type: 'FailedToStart',
        code: (error as { code?: string }).code,
        message: (error as Error).message,
      }
    }

    const { stdoutPipeError, stderrPipeError } =
      await this.attachStreamHandlers(subprocess)

    const exitCode = await subprocess.exited

    // Favor this order: StreamError > Killed > Exited
    if (stdoutPipeError || stderrPipeError) {
      return {
        type: 'StreamError',
        stdout: stdoutPipeError,
        stderr: stderrPipeError,
      }
    }

    if (subprocess.signalCode) {
      return { type: 'Killed', signal: subprocess.signalCode }
    }

    return { type: 'Exited', exitCode }
  }

  private async attachStreamHandlers(subprocess: JobSubprocess) {
    let pipeError: string | undefined

    // Convert web streams to Node.js streams for merging
    // See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
    const nodeStdout = Readable.fromWeb(subprocess.stdout)
    const nodeStderr = Readable.fromWeb(subprocess.stderr)

    // Merge the 2 streams and convert back to a web stream for piping to the output
    const merged: ReadableStream<Uint8Array> = Readable.toWeb(
      mergeStreams([nodeStdout, nodeStderr]),
    )

    await merged.pipeTo(this.logger, { preventClose: true }).catch(err => {
      subprocess.kill()
      pipeError = err instanceof Error ? err.message : String(err)
    })

    return { stdoutPipeError: pipeError, stderrPipeError: undefined }
  }
}
