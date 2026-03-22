export type PipelineSchedulerEvent =
  | { type: 'started'; name: string }
  | { type: 'settled'; name: string; success: boolean; error?: Error }
