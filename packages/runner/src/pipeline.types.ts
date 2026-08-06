import toposort from 'toposort'
import z from 'zod'
import { JobDefinitionSchema } from './job.types'

export const PipelineDefinitionSchema = z.object({
  name: z
    .string({ error: 'Pipeline name is required' })
    .min(1, 'Pipeline name cannot be empty'),
  jobs: z
    .array(JobDefinitionSchema)
    .nonempty({ message: 'At least one job is required' })
    .superRefine((jobs, ctx) => {
      // Unique job names
      const jobNames = new Set<string>()
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]!
        if (jobNames.has(job.name)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate job name: "${job.name}"`,
            path: [i, 'name'],
          })
        }
        jobNames.add(job.name)
      }

      // One producer per artifact name
      const producer = new Map<string, string>()
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]!
        for (const artifact of Object.keys(job.outputs ?? {})) {
          const existing = producer.get(artifact)
          if (existing !== undefined) {
            ctx.addIssue({
              code: 'custom',
              message: `Artifact "${artifact}" is produced by multiple jobs: "${existing}" and "${job.name}"`,
              path: [i, 'outputs', artifact],
            })
          } else {
            producer.set(artifact, job.name)
          }
        }
      }

      // Every input must be produced by some job
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]!
        for (const artifact of Object.keys(job.inputs ?? {})) {
          if (!producer.has(artifact)) {
            ctx.addIssue({
              code: 'custom',
              message: `Input "${artifact}" of job "${job.name}" is not produced by any job`,
              path: [i, 'inputs', artifact],
            })
          }
        }
      }

      // dependsOn must reference known jobs
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]!
        const deps = job.dependsOn ?? []
        for (let j = 0; j < deps.length; j++) {
          if (!jobNames.has(deps[j]!)) {
            ctx.addIssue({
              code: 'custom',
              message: `Job "${job.name}" depends on unknown job "${deps[j]}"`,
              path: [i, 'dependsOn', j],
            })
          }
        }
      }

      // Cycle detection on combined DAG (inferred artifact edges + explicit dependsOn)
      const edges: [string, string][] = []
      for (const job of jobs) {
        for (const artifact of Object.keys(job.inputs ?? {})) {
          const from = producer.get(artifact)
          if (from !== undefined && from !== job.name)
            edges.push([from, job.name])
        }
        for (const dep of job.dependsOn ?? []) {
          if (jobNames.has(dep) && dep !== job.name) edges.push([dep, job.name])
        }
      }

      try {
        toposort.array([...jobNames], edges)
      } catch (err) {
        ctx.addIssue({
          code: 'custom',
          message: `Cycle detected in job graph: ${(err as Error).message}`,
          path: [],
        })
      }
    }),
})

export type PipelineDefinition = z.infer<typeof PipelineDefinitionSchema>
