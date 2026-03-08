import z from 'zod'
import { JobDefinition } from './job.types'

export const PipelineDefinition = z.object({
  name: z
    .string({ error: 'Pipeline name is required' })
    .min(1, 'Pipeline name cannot be empty'),
  jobs: z
    .array(JobDefinition)
    .nonempty({ message: 'At least one job is required' }),
})

export type PipelineDefinition = z.infer<typeof PipelineDefinition>

export const PipelineContext = z.object({
  repoUrl: z.string().nonempty({ message: 'Repository URL cannot be empty' }),
  repoBranch: z.string().optional(),
  pipeline: PipelineDefinition.required(),
  workspacePath: z.string().nonempty({ message: 'Workspace cannot be empty' }),
  artifactsPath: z
    .string()
    .nonempty({ message: 'Artifacts path cannot be empty' }),
})

export type PipelineContext = z.infer<typeof PipelineContext>
