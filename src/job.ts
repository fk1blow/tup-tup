import type { Subprocess } from 'bun'
import { parseJobDefinition } from './cli'
import type { JobCommandResult, JobDefinition } from './job.types'

type JobSubprocess = Subprocess<'inherit', 'pipe', 'pipe'>

export class Job {
  private job: JobDefinition

  constructor() {
    const jobDefinitionJson = process.argv.slice(2).at(0)

    if (!jobDefinitionJson)
      throw new Error(
        'Cannot start Job: No job definition provided when spawned',
      )

    const jobDefinition = parseJobDefinition(jobDefinitionJson)
    if (!jobDefinition)
      throw new Error('Cannot start Job: No Job definition provided')

    this.job = jobDefinition
  }

  async run() {
    process.send?.({ type: 'job:started', jobName: this.job.name })

    for (const [commandIndex, command] of this.job.commands.entries()) {
      process.send?.({
        type: 'command:started',
        jobName: this.job.name,
        commandIndex,
      })

      const result = await this.runCommand(command)

      if (result.type === 'FailedToStart') {
        process.send?.({
          type: 'command:finished',
          jobName: this.job.name,
          commandIndex,
          result,
        })

        process.send?.({
          type: 'job:finished',
          jobName: this.job.name,
          success: false,
        })

        // Bail out if the command failed to start
        return
      } else if (result.type === 'Exited') {
        process.send?.({
          type: 'command:finished',
          jobName: this.job.name,
          commandIndex,
          result,
        })

        if (result.exitCode !== 0) {
          process.send?.({
            type: 'job:finished',
            jobName: this.job.name,
            success: false,
          })
          // Bail out if the command exited with a non-zero code
          return
        }
      } else if (result.type === 'Killed') {
        process.send?.({
          type: 'command:finished',
          jobName: this.job.name,
          commandIndex,
          result,
        })

        process.send?.({
          type: 'job:finished',
          jobName: this.job.name,
          success: false,
        })

        // Bail out if the process was killed
        return
      } else if (result.type === 'StreamError') {
        process.send?.({
          type: 'command:finished',
          jobName: this.job.name,
          commandIndex,
          result,
        })

        process.send?.({
          type: 'job:finished',
          jobName: this.job.name,
          success: false,
        })

        // Bail out if there was a stream error
        return
      }
    }

    process.send?.({
      type: 'job:finished',
      jobName: this.job.name,
      success: true,
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
    const logFile = Bun.file(
      `${this.job.logsDir}/${this.job.name.replace(/\s+/g, '_')}.log`,
    )
    const logStream = logFile.writer()
    const decoder = new TextDecoder()

    const stdoutStream = new WritableStream({
      write: chunk => {
        logStream.write(`${decoder.decode(chunk)} \n`)
        // console.log(
        //   `[${this.job.name}] stdout: ${new TextDecoder().decode(chunk)}`,
        // )
      },
      close: () => {
        // console.log(`[${this.job.name}] stdout stream closed \n`)
      },
      abort: err => {
        // console.error(`[${this.job.name}] stdout stream error:`, err)
      },
    })

    const stderrStream = new WritableStream({
      write: chunk => {
        logStream.write(`${decoder.decode(chunk)} \n`)
        // console.log(
        //   `[${this.job.name}] stderr: ${new TextDecoder().decode(chunk)}`,
        // )
      },
      close: () => {
        // console.log(`[${this.job.name}] stderr stream closed \n`)
      },
      abort: err => {
        // console.error(`[${this.job.name}] stderr stream error:`, err)
      },
    })

    let stdoutPipeError: string | undefined
    let stderrPipeError: string | undefined

    const stdoutDone = subprocess.stdout.pipeTo(stdoutStream).catch(err => {
      subprocess.kill()
      stdoutPipeError = err instanceof Error ? err.message : String(err)
    })

    const stderrDone = subprocess.stderr.pipeTo(stderrStream).catch(err => {
      subprocess.kill()
      stderrPipeError = err instanceof Error ? err.message : String(err)
    })

    await Promise.all([stdoutDone, stderrDone]).finally(() => {
      logStream.flush()
      logStream.end()
    })

    return { stdoutPipeError, stderrPipeError }
  }
}

await new Job().run()
