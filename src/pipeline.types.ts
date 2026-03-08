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

export interface PipelineContext {
  repoUrl: string
  repoBranch?: string
  definition: PipelineDefinition
  workspacePath: string
  artifactsPath: string
  logsPath: string
  // hmm, don't like having both repoUrl and repoPath here, but it is what it is for now
  repoPath: string
}
