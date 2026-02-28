import z from 'zod'

export const JobDefinition = z.object({
  name: z
    .string({ error: 'Job name is required' })
    .min(1, 'Job name cannot be empty'),
  commands: z
    .array(
      z.array(z.string()).min(1, 'At least one command argument is required'),
    )
    .min(1, 'At least one command is required'),
})
export type JobDefinition = z.infer<typeof JobDefinition>

export const JobDefinitionJson = z
  .string({ error: 'Job definition is required' })
  .transform((val, ctx) => {
    try {
      return JSON.parse(val)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid JSON for job definition',
      })
      return z.NEVER
    }
  })
  .pipe(JobDefinition)

export type JobDefinitionJson = z.infer<typeof JobDefinitionJson>

/**
 * Represents the result of executing a job command, including various failure modes and success.
 *
 * - `FailedToStart`: Indicates the command failed to start, with an optional error code and message.
 * - `StreamError`: Represents an error that occurred while streaming or attaching a pipe to stdout or stderr
 * - `Exited`: Indicates the command exited normally with a specific exit code.
 * - `Killed`: Represents the command being killed by a signal, including the signal name.
 */
export type JobCommandResult =
  | { type: 'FailedToStart'; code?: string; message: string }
  | { type: 'StreamError'; stdout?: string; stderr?: string }
  | { type: 'Exited'; exitCode: number }
  | { type: 'Killed'; signal: NodeJS.Signals }

export type JobStartedEvent = { jobName: string }
export type JobCommandStartedEvent = { jobName: string; commandIndex: number }
export type JobCommandFinishedEvent = {
  jobName: string
  commandIndex: number
  result: JobCommandResult
}
export type JobFinishedEvent = { jobName: string; success: boolean }

export type JobEvent =
  | JobStartedEvent
  | JobFinishedEvent
  | JobCommandStartedEvent
  | JobCommandFinishedEvent

/**
 * A mapping of job event types to their corresponding payloads.
 *
 * Example:
 * `emitter.emit('command:started', { jobName: 'Test Job' })`
 * `emitter.emit('job:finished', { jobName: 'Test Job', success: true })`
 */
export type JobEventMap = {
  'job:started': [JobStartedEvent]
  'command:started': [JobCommandStartedEvent]
  'command:finished': [JobCommandFinishedEvent]
  'job:finished': [JobFinishedEvent]
}
