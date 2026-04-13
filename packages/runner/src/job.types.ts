import z from 'zod'

const RunStep = z.object({
  run: z.union([z.string().min(1), z.array(z.string()).min(1)]),
})

const ActionStep = z.looseObject({
  action: z.string().min(1),
  paths: z.array(z.string()).optional(),
})

const Step = z.union([RunStep, ActionStep])

export const JobDefinition = z.object({
  name: z
    .string({ error: 'Job name is required' })
    .min(1, 'Job name cannot be empty'),
  image: z.string().min(1, 'Docker image name is required'),
  steps: z.array(Step).min(1, 'At least one step is required'),
  allowFailure: z.boolean().optional(),
  dependsOn: z.array(z.string()).optional(),
  timeout: z.number().optional(),
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
