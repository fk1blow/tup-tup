import { JobDefinition } from './job.types'

export class Job {
  private job: JobDefinition

  constructor(job: JobDefinition) {
    console.log('Initializing JobRunner with job:', job.name)
    this.job = job
  }

  async run() {
    Bun.spawn(this.job.cmd)
    // await this.job.execute()
  }
}

const args = process.argv.slice(2)

const parsedJob = JobDefinition.safeParse({
  name: args[0],
  cmd: args.slice(1),
})

if (!parsedJob.success) {
  console.error('Invalid job arguments:')
  for (const issue of parsedJob.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

const runner = new JobDefinition(parsedJob.data)
