import path from 'path'
import type { EventEmitter } from 'stream'
import { DockerExecutor } from './docker-executor'
import { Job } from './job'
import type { JobDefinition, JobEventMap } from './job.types'
import type { PipelineContext } from './pipeline.types'

export class Workflow {
  constructor(
    private pipelineContext: PipelineContext,
    private emitter: EventEmitter<JobEventMap>,
  ) {}

  async run() {
    for (const job of this.pipelineContext.definition.jobs) {
      await this.runJob(job)
    }
  }

  private async runJob(jobDefinition: JobDefinition) {
    console.log(`Running job ${jobDefinition.name}...`)

    const executor = new DockerExecutor({
      name: jobDefinition.name,
      image: jobDefinition.image,
    })

    // TODO try/catch around this
    await executor.start()

    // hmmmm
    const logger = this.createFileLogger(jobDefinition.name)

    const job = new Job(jobDefinition, this.emitter, logger, executor)

    await job.run()

    await executor.stop()

    await logger.close()
  }

  private createFileLogger(jobName: string): WritableStream<Uint8Array> {
    const file = Bun.file(
      path.join(this.pipelineContext.logsPath, `${jobName}.log`),
    )
    const writer = file.writer()

    const decoder = new TextDecoder()
    let buffer = ''

    return new WritableStream<Uint8Array>({
      write(chunk) {
        buffer += decoder.decode(chunk, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line) writer.write(`${line}\n`)
        }
      },

      async close() {
        if (buffer) writer.write(`${buffer}\n`)
        await writer.flush()
        writer.end()
      },

      async abort(_reason) {
        if (buffer) writer.write(buffer + '\n')
        await writer.flush()
        writer.end()
      },
    })
  }
}
