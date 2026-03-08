import type { JobDefinition } from './job.types'
import type { PipelineContext } from './pipeline.types'

export class Workflow {
  constructor(private pipelineContext: PipelineContext) {}

  async run() {
    for (const job of this.pipelineContext.definition.jobs) {
      await this.runJob(job)
    }
  }

  private async runJob(job: JobDefinition) {
    console.log(`Running job ${job.name}...`)
    //
    // - setup docker container with the specified image
    // - create a new job
  }
}
