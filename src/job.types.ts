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
  logsDir: z.string().nonempty({ message: 'logsDir is required' }),
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

export type JobCommandResult =
  | { type: 'FailedToStart'; code?: string; message: string }
  | { type: 'StreamError'; stdout?: string; stderr?: string }
  | { type: 'Exited'; exitCode: number }
  | { type: 'Killed'; signal: NodeJS.Signals }

export type JobMessage =
  | {
      type: 'job:started'
      jobName: string
    }
  | {
      type: 'command:started'
      jobName: string
      commandIndex: number
    }
  | {
      type: 'command:finished'
      jobName: string
      commandIndex: number
      result: JobCommandResult
    }
  | {
      type: 'job:finished'
      jobName: string
      success: boolean
    }
