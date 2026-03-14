import type {
  JobCommandFinishedEvent,
  JobCommandStartedEvent,
  JobFinishedEvent,
  JobStartedEvent,
} from './job.types'

export interface JobReporter {
  onJobStarted: (event: JobStartedEvent) => void
  onCommandStarted: (event: JobCommandStartedEvent) => void
  onCommandFinished: (event: JobCommandFinishedEvent) => void
  onJobFinished: (event: JobFinishedEvent) => void
}
