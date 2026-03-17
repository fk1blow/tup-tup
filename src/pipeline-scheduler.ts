import type { ExecutorFactory } from './executor'
import { Job } from './job'
import type { JobReporter } from './job-reporter'
import type { JobDefinition } from './job.types'
import type { LoggerFactory } from './logger'
import type { RuntimeContext } from './runtime-context'

export class PipelineScheduler {
  private runtimeCtx: RuntimeContext
  private jobReporter: JobReporter
  private fileLoggerFactory: LoggerFactory
  private dockerExecutorFactory: ExecutorFactory

  // TODO we also need to store if the job succeeded or not, or has been skipped
  // something like this: Map<string, { settled: boolean, success: boolean, jobDefinition: JobDefinition }>
  //
  // TODO don't think we need to keep the job definition here,
  // b/c we already have the Map's keys as the job names, which we can use
  // to get the job definition from the runtime context.
  //
  // "settled" means finished one way or another, either success, failure, or skipped
  private settledJobs: Map<string, [boolean, JobDefinition]> = new Map()
  private runningJobs: Map<string, Promise<[boolean, JobDefinition]>> =
    new Map()

  constructor(opts: {
    runtimeCtx: RuntimeContext
    jobReporter: JobReporter
    fileLoggerFactory: LoggerFactory
    dockerExecutorFactory: ExecutorFactory
  }) {
    this.runtimeCtx = opts.runtimeCtx
    this.jobReporter = opts.jobReporter
    this.fileLoggerFactory = opts.fileLoggerFactory
    this.dockerExecutorFactory = opts.dockerExecutorFactory
  }

  async schedule() {
    while (true) {
      const readyJobs = this.getReadyJobs()
      console.log('readyJobs:', readyJobs.length)
      if (readyJobs.length === 0 && this.runningJobs.size === 0) break

      console.log('running jobs:', Array.from(this.runningJobs.keys()))

      const alreadyRunningJobs = Array.from(this.runningJobs.values())

      const nextRunningJobs = new Map(
        readyJobs.map(job => [job.name, this.runJob(job)]),
      )

      nextRunningJobs.forEach((promise, jobName) => {
        this.runningJobs.set(jobName, promise)
      })
      console.log('next running jobs:', Array.from(this.runningJobs.keys()))

      // We need to wait for both the currently running jobs and the read ones
      // if not, we'll simply skip the ones that might have not settled yet(and still running)
      const jobResult = await Promise.race([
        ...alreadyRunningJobs,
        ...nextRunningJobs.values(),
      ])
      console.log('job finished:', jobResult[1].name, 'success:', jobResult[0])

      this.runningJobs.delete(jobResult[1].name)
      console.log(
        'remaining total jobs running:',
        this.runtimeCtx.pipeline.jobs.length - this.settledJobs.size,
      )
      this.settledJobs.set(jobResult[1].name, jobResult)

      console.log('-------------------------------')
    }
  }

  private async runJob(jobDefinition: JobDefinition) {
    const executor = this.dockerExecutorFactory.create(jobDefinition)

    const logger = this.fileLoggerFactory.create(jobDefinition.name)

    let jobResult = [false, jobDefinition] as [boolean, JobDefinition]

    try {
      await executor.start()

      const job = new Job({
        definition: jobDefinition,
        reporter: this.jobReporter,
        logger,
        executor,
      })

      const runResult = await job.run()
      // jobResult = [runResult, jobDefinition]
      jobResult = runResult
    } catch (err) {
      // TODO need more than this
      // Maybe we should just re-throw the error and let the caller handle it,
      // for example, if the executor fails to start, what do we do?
      // Do we mark the job as failed and move on to the next one? Do we retry? Do we stop the whole pipeline?
      //
      // Actually, this could fail in the middle of the pipeline execution
      console.error(`Error running job ${jobDefinition.name}:`, err)

      jobResult = [false, jobDefinition]
    } finally {
      await executor.stop()
      await logger.stop()
    }

    return jobResult
  }

  private getReadyJobs(): JobDefinition[] {
    const allJobs = this.runtimeCtx.pipeline.jobs

    return allJobs.filter(job => {
      const isRunning = this.runningJobs.has(job.name)
      const isSettled = this.settledJobs.has(job.name)
      if (isRunning || isSettled) return false

      if (!job.dependsOn) return true

      return job.dependsOn.every(
        dep => this.settledJobs.get(dep)?.at(0) === true,
      )
    })
  }
}
