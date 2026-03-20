import type { ExecutorFactory } from './executor'
import { Job } from './job'
import type { JobDefinition } from './job.types'
import type { LoggerFactory } from './logger'
import type { PipelineSchedulerEvent } from './pipeline-scheduler.types'
import type { RuntimeContext } from './runtime-context'

type JobNameKey = string
type SettledJobResult = [boolean, JobDefinition, Error?]

export class PipelineScheduler {
  private runtimeCtx: RuntimeContext
  private fileLoggerFactory: LoggerFactory
  private dockerExecutorFactory: ExecutorFactory

  // "settled" means finished, either succeeded or failed
  private settledJobs: Map<JobNameKey, SettledJobResult> = new Map()
  private runningJobs: Map<JobNameKey, Promise<SettledJobResult>> = new Map()

  constructor(opts: {
    runtimeCtx: RuntimeContext
    fileLoggerFactory: LoggerFactory
    dockerExecutorFactory: ExecutorFactory
  }) {
    this.runtimeCtx = opts.runtimeCtx
    this.fileLoggerFactory = opts.fileLoggerFactory
    this.dockerExecutorFactory = opts.dockerExecutorFactory
  }

  async *schedule(): AsyncGenerator<PipelineSchedulerEvent> {
    while (true) {
      const readyJobs = this.getReadyJobs()
      if (readyJobs.length === 0 && this.runningJobs.size === 0) break

      // Build the next set of running jobs
      const nextRunningJobs = new Map(
        readyJobs.map(job => [job.name, this.runJob(job)]),
      )

      for (const [jobName, promise] of nextRunningJobs) {
        this.runningJobs.set(jobName, promise)
        yield { type: 'started', name: jobName }
      }

      // Have to wait for both the running jobs and the newly/next added ones
      // otherwise it simply skips the jobs that might have not settled yet(and still running)
      const [success, jobDefinition, error] = await Promise.race([
        ...this.runningJobs.values(),
        ...nextRunningJobs.values(),
      ])
      const { name } = jobDefinition

      this.runningJobs.delete(name)
      this.settledJobs.set(name, [success, jobDefinition, error])

      yield { type: 'settled', name, success, error }
    }
  }

  private async runJob(
    jobDefinition: JobDefinition,
  ): Promise<[boolean, JobDefinition, Error?]> {
    const executor = this.dockerExecutorFactory.create(jobDefinition)
    const logger = this.fileLoggerFactory.create(jobDefinition.name)

    let jobResult: [boolean, JobDefinition, Error?]

    try {
      await executor.start()
      jobResult = await new Job({
        definition: jobDefinition,
        logger,
        executor,
      }).run()
    } catch (err) {
      jobResult = [
        false,
        jobDefinition,
        err instanceof Error
          ? err
          : new Error('Unknown pipeline schedule error'),
      ]
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
        // Is the dependency settled and succeeded?
        dep => this.settledJobs.get(dep)?.at(0) === true,
      )
    })
  }
}
