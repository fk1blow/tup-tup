import type { ExecutorFactory } from './executor'
import { Job } from './job'
import type { JobReporter } from './job-reporter'
import type { JobDefinition, JobEventMap } from './job.types'
import type { LoggerFactory } from './logger'
import type { RuntimeContext } from './runtime-context'

export class JobCoordinator {
  private runtimeCtx: RuntimeContext
  private jobReporter: JobReporter
  private fileLoggerFactory: LoggerFactory
  private dockerExecutorFactory: ExecutorFactory

  constructor(opts: {
    runtimeCtx: RuntimeContext
    fileLoggerFactory: LoggerFactory
    jobReporter: JobReporter
    dockerExecutorFactory: ExecutorFactory
  }) {
    const {
      runtimeCtx,
      jobReporter,
      fileLoggerFactory,
      dockerExecutorFactory,
    } = opts

    this.runtimeCtx = runtimeCtx
    this.jobReporter = jobReporter
    this.fileLoggerFactory = fileLoggerFactory
    this.dockerExecutorFactory = dockerExecutorFactory
  }

  async run() {
    // TODO handle errors
    // Actually, we need to do more than that:
    // - use the `https://www.npmjs.com/package/dependency-graph` package to determine the order of execution for the jobs
    // - if a job fails, we should mark all the dependent jobs as failed as well, and skip their execution
    // -..... and more
    for (const job of this.runtimeCtx.definition.jobs) {
      await this.runJob(job)
    }
  }

  private async runJob(jobDefinition: JobDefinition) {
    console.log(`Running job ${jobDefinition.name}...`)

    const executor = this.dockerExecutorFactory.create({
      name: jobDefinition.name,
      image: jobDefinition.image,
    })

    const logger = this.fileLoggerFactory.create(jobDefinition.name)

    // const emitter = this.

    try {
      await executor.start()
      const job = new Job({
        definition: jobDefinition,
        reporter: this.jobReporter,
        logger,
        executor,
      })
      await job.run()
    } finally {
      await executor.stop()
      await logger.stop()
    }
  }
}
