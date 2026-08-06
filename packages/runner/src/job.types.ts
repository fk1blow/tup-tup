import z from 'zod'

const Step = z.array(z.string().min(1)).min(1, 'Step command cannot be empty')

const ArtifactMap = z.record(
  z.string().min(1, 'Artifact name cannot be empty'),
  z.string().min(1, 'Artifact path cannot be empty'),
)

export const JobDefinitionSchema = z.object({
  name: z
    .string({ error: 'Job name is required' })
    .min(1, 'Job name cannot be empty'),
  image: z.string().min(1, 'Docker image name is required'),
  steps: z.array(Step).min(1, 'At least one step is required'),
  inputs: ArtifactMap.optional(),
  outputs: ArtifactMap.optional(),
  allowFailure: z.boolean().optional(),
  dependsOn: z.array(z.string()).optional(),
  timeout: z.number().optional(),
})

export type JobDefinition = z.infer<typeof JobDefinitionSchema>

export type JobName = JobDefinition['name']
