import z from 'zod'

export const Job = z.object({
  name: z.string({ error: 'Job name is required' }).min(1, 'Job name cannot be empty'),
  cmd: z.array(z.string()).min(1, 'At least one command argument is required'),
})

export type Job = z.infer<typeof Job>
