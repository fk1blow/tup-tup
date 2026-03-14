import type EventEmitter from 'events'
import type { JobReporter } from './job-reporter'
import type {
  JobCommandFinishedEvent,
  JobCommandStartedEvent,
  JobEventMap,
  JobFinishedEvent,
  JobStartedEvent,
} from './job.types'

export class EventEmitterReporter implements JobReporter {
  constructor(private emitter: EventEmitter<JobEventMap>) {}

  onJobStarted(event: JobStartedEvent): void {
    this.emitter.emit('job:started', event)
  }

  onCommandStarted(event: JobCommandStartedEvent): void {
    this.emitter.emit('command:started', event)
  }

  onCommandFinished(event: JobCommandFinishedEvent): void {
    this.emitter.emit('command:finished', event)
  }

  onJobFinished(event: JobFinishedEvent): void {
    this.emitter.emit('job:finished', event)
  }
}
