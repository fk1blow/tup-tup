export const PipelineSchedulerEventType = {
  RunStarted: 'run:started',
  RunFinished: 'run:finished',
  JobStarted: 'job:started',
  JobSettled: 'job:settled',
} as const

export type PipelineSchedulerJobEvent =
  | {
      type: typeof PipelineSchedulerEventType.JobStarted
      pipeline: string
      job: string
    }
  | {
      type: typeof PipelineSchedulerEventType.JobSettled
      pipeline: string
      job: string
      success: boolean
      error?: Error
    }

export type PipelineSchedulerRunEvent =
  | { type: typeof PipelineSchedulerEventType.RunStarted; pipeline: string }
  | {
      type: typeof PipelineSchedulerEventType.RunFinished
      pipeline: string
      error?: Error
    }

export type PipelineSchedulerEvent =
  | PipelineSchedulerJobEvent
  | PipelineSchedulerRunEvent

export const isPipelineSchedulerJobEvent = (
  event: PipelineSchedulerEvent,
): event is PipelineSchedulerJobEvent =>
  event.type === PipelineSchedulerEventType.JobStarted ||
  event.type === PipelineSchedulerEventType.JobSettled
