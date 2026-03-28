import type { BunFile, FileSink, FileSystemRouter } from 'bun'
import path from 'path'
import type { PipelineSchedulerEvent } from './pipeline-scheduler.types'

export class EventsLogger {
  private fileWriter: FileSink

  constructor(private logFilePath: string) {
    const file = Bun.file(path.join(`${this.logFilePath}.log`))
    this.fileWriter = file.writer()
  }

  async log(event: PipelineSchedulerEvent) {
    const encoder = new TextEncoder()
    const augmentedEvent = {
      timestamp: new Date().toISOString(),
      ...event,
    }
    const encodedEvent = encoder.encode(JSON.stringify(augmentedEvent) + '\n')
    await this.fileWriter.write(encodedEvent)
  }

  async close() {
    await this.fileWriter.flush()
    this.fileWriter.end()
  }
}
