import z from 'zod'
import { JobDefinition } from './job.types'

export const PipelineDefinition = z.object({
  name: z
    .string({ error: 'Pipeline name is required' })
    .min(1, 'Pipeline name cannot be empty'),
  jobs: z
    .array(JobDefinition)
    .nonempty({ message: 'At least one job is required' })
    .superRefine((jobs, ctx) => {
      const names = new Set<string>()
      for (const job of jobs) {
        if (names.has(job.name)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate job name: "${job.name}"`,
            path: [jobs.indexOf(job), 'name'],
          })
        }
        names.add(job.name)
      }
    }),
})

export type PipelineDefinition = z.infer<typeof PipelineDefinition>
