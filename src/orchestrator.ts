import { Job } from './job.types'

export type JobPipeline = Job[]

export type PipelineState = {
  status: 'inactive' | 'running' | 'completed' | 'failed'
  job: Job['name'] | null
  jobIndex: number
}

export class Orchestrator {
  private pipeline: JobPipeline
  private state: PipelineState
  private jobTimeout: NodeJS.Timeout | null = null

  constructor(pipeline: JobPipeline) {
    this.pipeline = pipeline
    this.state = { status: 'inactive', job: null, jobIndex: 0 }
  }

  async start() {
    if (this.state.status === 'running') throw new Error('Pipeline is already running')
    if (this.pipeline.length === 0) throw new Error('Pipeline is empty')

    this.state.status = 'running'

    const nextJob = this.pipeline[this.state.jobIndex]
    if (!nextJob) throw new Error('No job found at index ' + this.state.jobIndex)
    await this.startJob(nextJob)

    // this.jobTimeout = setTimeout(() => {

    return true
  }

  getPipelineState(): Readonly<PipelineState> {
    return Object.freeze({ ...this.state })
  }

  private async startJob(job: Job) {
    this.state.job = job.name
    // await job.execute()
  }
}
