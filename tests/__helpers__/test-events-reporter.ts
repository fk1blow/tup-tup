import type { JobReporter } from '../../src/job-reporter'
import type { JobEventMap } from '../../src/job.types'
import type { Logger } from '../../src/logger'
import type { TypedJobEvent } from './job.test-helpers'

export class TestEventsReporter implements JobReporter {
  public events: TypedJobEvent[] = []

  constructor(private logger: Logger) {}

  onJobStarted(payload: JobEventMap['job:started'][0]) {
    this.events.push({ type: 'job:started', ...payload })
  }

  onCommandStarted(payload: JobEventMap['command:started'][0]) {
    this.events.push({ type: 'command:started', ...payload })
  }

  onCommandFinished(payload: JobEventMap['command:finished'][0]) {
    this.events.push({ type: 'command:finished', ...payload })
  }

  async onJobFinished(payload: JobEventMap['job:finished'][0]) {
    this.events.push({ type: 'job:finished', ...payload })
    await this.logger.stop()
  }
}
