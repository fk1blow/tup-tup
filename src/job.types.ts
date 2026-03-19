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
  image: z.string().min(1, 'Docker image name is required'),
  allowFailure: z.boolean().optional(),
  dependsOn: z.array(z.string()).optional(),
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
