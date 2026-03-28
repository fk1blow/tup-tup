export const PipelineSchedulerEventType = {
  RUN_STARTED: 'run:started',
  RUN_FINISHED: 'run:finished',
  JOB_STARTED: 'job:started',
  JOB_SETTLED: 'job:settled',
} as const

export type PipelineSchedulerJobEvent =
  | {
      type: typeof PipelineSchedulerEventType.JOB_STARTED
      pipeline: string
      job: string
    }
  | {
      type: typeof PipelineSchedulerEventType.JOB_SETTLED
      pipeline: string
      job: string
      success: boolean
      error?: Error
    }

export type PipelineSchedulerRunEvent =
  | { type: typeof PipelineSchedulerEventType.RUN_STARTED; pipeline: string }
  | { type: typeof PipelineSchedulerEventType.RUN_FINISHED; pipeline: string }

export type PipelineSchedulerEvent =
  | PipelineSchedulerJobEvent
  | PipelineSchedulerRunEvent

export const isPipelineSchedulerJobEvent = (
  event: PipelineSchedulerEvent,
): event is PipelineSchedulerJobEvent =>
  event.type === PipelineSchedulerEventType.JOB_STARTED ||
  event.type === PipelineSchedulerEventType.JOB_SETTLED
