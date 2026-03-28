import path from 'path'
import type { ExecutorFactory } from './executor'
import { Job } from './job'
import type { JobDefinition } from './job.types'
import type { JobsLogger } from './jobs-logger'
import type { PipelineSchedulerEvent } from './pipeline-scheduler.types'
import type { RuntimeContext } from './runtime-context'

type JobNameKey = string
type SettledJobResult = [boolean, JobDefinition, Error?]
type PipelineSchedulerOpts = {
  runtimeCtx: RuntimeContext
  jobsLoggerFactory: (logFilePath: string) => JobsLogger
  dockerExecutorFactory: ExecutorFactory<{
    workspacePath: string
    image: string
    name: string
  }>
}

export class PipelineScheduler {
  private runtimeCtx: RuntimeContext
  private jobsLoggerFactory: PipelineSchedulerOpts['jobsLoggerFactory']
  private dockerExecutorFactory: PipelineSchedulerOpts['dockerExecutorFactory']

  private settledJobs: Map<JobNameKey, SettledJobResult> = new Map()
  private runningJobs: Map<JobNameKey, Promise<SettledJobResult>> = new Map()

  constructor(opts: PipelineSchedulerOpts) {
    this.runtimeCtx = opts.runtimeCtx
    this.jobsLoggerFactory = opts.jobsLoggerFactory
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

      // Have to wait for both the (still)running jobs and the newly/next added ones
      // otherwise it simply skips the jobs that might have not settled yet(and still running)
      const [success, jobDefinition, error] = await Promise.race(
        this.runningJobs.values(),
      )

      const { name } = jobDefinition
      this.runningJobs.delete(name)
      this.settledJobs.set(name, [success, jobDefinition, error])

      yield { type: 'settled', name, success, error }
    }
  }

  private async runJob(job: JobDefinition): Promise<SettledJobResult> {
    const executor = this.dockerExecutorFactory({
      workspacePath: this.runtimeCtx.workspacePath,
      image: job.image,
      name: job.name,
    })
    const logger = this.jobsLoggerFactory(
      path.join(this.runtimeCtx.logsPath, job.name),
    )

    let jobResult: [boolean, JobDefinition, Error?]

    try {
      await executor.start()
      jobResult = await new Job({
        definition: job,
        logger,
        executor,
      }).run()
    } catch (err) {
      jobResult = [
        false,
        job,
        // Dafuk is this?
        err instanceof Error
          ? err
          : new Error('Unknown pipeline schedule error'),
      ]
    } finally {
      await executor.stop()
      await logger.close()
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
