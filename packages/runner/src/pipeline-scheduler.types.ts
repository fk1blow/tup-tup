export type PipelineSchedulerEvent =
  | { type: 'run:started'; pipeline: string }
  | { type: 'run:finished'; pipeline: string }
  | { type: 'job:started'; pipeline: string; job: string }
  | {
      type: 'job:settled'
      pipeline: string
      job: string
      success: boolean
      error?: Error
    }
