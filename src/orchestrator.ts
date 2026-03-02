import type { Subprocess } from 'bun'
import { JobDefinition } from './job.types'

export type JobPipeline = JobDefinition[]

export type PipelineState = {
  status: 'inactive' | 'running' | 'completed' | 'failed'
  job: JobDefinition | null
  process?: Subprocess<'inherit', 'pipe', 'pipe'>
  jobIndex: number
}

export class Orchestrator {
  private jobsPipeline: JobPipeline
  private pipelineState: PipelineState
  private jobTimeout: NodeJS.Timeout | null = null

  constructor(opts: { jobs: JobPipeline }) {
    this.jobsPipeline = opts.jobs
    this.pipelineState = { status: 'inactive', job: null, jobIndex: 0 }
  }

  async start() {
    this.ensurePipelineCanStart()

    const { job, jobIndex } = this.getNextJobInPipeline()
    this.pipelineState.job = job
    this.pipelineState.jobIndex = jobIndex
    this.pipelineState.status = 'running'

    this.startJob(job)
    this.monitorJob()

    return true
  }

  // Don't like this method, currently used for testing purposes only
  getPipelineState(): Readonly<PipelineState> {
    return Object.freeze({ ...this.pipelineState })
  }

  private startJob(job: JobDefinition) {
    this.pipelineState.job = job

    this.pipelineState.process = Bun.spawn(['bun', 'run', './src/job.ts', job.name, ...job.cmd], {
      stdout: 'pipe',
      stderr: 'pipe',
      ipc: message => {
        console.log('message from child:', message)
      },
      onExit: (_subprocess, exitCode, signalCode, error) => {
        console.log(
          `[${this.pipelineState.job?.name}] exited with code ${exitCode}, signal ${signalCode}, error: ${error}`,
        )
      },
    })

    console.log(
      `[${this.pipelineState.job.name}] started with PID ${this.pipelineState.process.pid}`,
    )
  }

  private monitorJob() {
    const process = this.pipelineState.process
    if (!process) throw new Error('No process to monitor')

    process.stdout.pipeTo(
      new WritableStream({
        write: chunk => {
          console.log(`[${this.pipelineState.job?.name}] stdout: ${chunk}`)
        },
        close: () => {
          console.log(`[${this.pipelineState.job?.name}] stdout stream closed`)
        },
        abort: err => {
          console.error(`[${this.pipelineState.job?.name}] stdout stream error:`, err)
        },
      }),
    )

    // process.stderr?.pipeTo(
    //   new WritableStream({
    //     write: chunk => {
    //       console.error(`[${this.pipelineState.job?.name}] stderr: ${chunk}`)
    //     },
    //     close: () => {
    //       console.log(`[${this.pipelineState.job?.name}] stderr stream closed`)
    //     },
    //     abort: err => {
    //       console.error(`[${this.pipelineState.job?.name}] stderr stream error:`, err)
    //     },
    //   }),
    // )
  }

  private ensurePipelineCanStart() {
    if (this.pipelineState.status === 'running') {
      throw new Error('Pipeline is already running')
    }
    if (this.jobsPipeline.length === 0) {
      throw new Error('Pipeline is empty')
    }
  }

  private getNextJobInPipeline(): { job: JobDefinition; jobIndex: number } {
    const { jobIndex, status } = this.pipelineState

    if (status === 'failed' || status === 'completed')
      throw new Error(`Pipeline is in '${status}' state, cannot proceed to next job`)

    if (jobIndex >= this.jobsPipeline.length)
      throw new Error(`Cannot proceed to next job, already at the end of the pipeline`)

    // when 'inactive', pipeline hasn't started yet(or just starting now), proceed with the first job
    if (status === 'inactive') {
      const startJob = this.jobsPipeline[jobIndex]
      if (!startJob) throw new Error('No job found at index ' + jobIndex)

      return { job: startJob, jobIndex }
    }
    // if we're 'running', it can proceed to the next job in the pipeline
    else if (status === 'running') {
      const nextJobIndex = jobIndex + 1
      const nextJob = this.jobsPipeline[nextJobIndex]
      if (!nextJob) throw new Error('No job found at index ' + nextJobIndex)

      return { job: nextJob, jobIndex: nextJobIndex }
    }

    throw new Error(`Unhandled pipeline state: ${status}`)
  }
}
