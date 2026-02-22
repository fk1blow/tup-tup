import z from 'zod'

export const JobDefinition = z.object({
  name: z.string({ error: 'Job name is required' }).min(1, 'Job name cannot be empty'),
  cmd: z.array(z.string()).min(1, 'At least one command argument is required'),
})

export type JobDefinition = z.infer<typeof JobDefinition>
