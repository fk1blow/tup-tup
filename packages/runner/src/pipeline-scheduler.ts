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
  jobsLoggerFactory: (logFilePath: string) => {
    pipe: (...streams: ReadableStream[]) => Promise<void>
    close: () => Promise<void>
  }
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
      // No more ready jobs and no more running jobs, we are done
      if (readyJobs.length === 0 && this.runningJobs.size === 0) break

      const nextRunningJobs = new Map(
        readyJobs.map((job: JobDefinition) => [job.name, this.runJob(job)]),
      )

      for (const [jobName, promise] of nextRunningJobs) {
        this.runningJobs.set(jobName, promise)
        yield {
          type: 'job:started',
          pipeline: this.runtimeCtx.pipeline.name,
          job: jobName,
        }
      }

      // Have to wait for both the (still)running jobs and the newly/next added ones
      // otherwise it simply skips the jobs that might have not settled yet(and still running)
      const [success, jobDefinition, error] = await Promise.race(
        this.runningJobs.values(),
      )

      const { name } = jobDefinition
      this.runningJobs.delete(name)
      this.settledJobs.set(name, [success, jobDefinition, error])

      yield {
        type: 'job:settled',
        pipeline: this.runtimeCtx.pipeline.name,
        job: name,
        success,
        error,
      }
    }
  }

  private async runJob(definition: JobDefinition): Promise<SettledJobResult> {
    const executor = this.dockerExecutorFactory({
      workspacePath: this.runtimeCtx.workspacePath,
      image: definition.image,
      name: definition.name,
    })
    const logger = this.jobsLoggerFactory(
      path.join(this.runtimeCtx.logsPath, definition.name),
    )
    const job = new Job({
      definition,
      logger,
      executor,
    })

    await executor.start()
    const jobRun = job.run()

    const { timer: jobTimeout, stop: stopTimer } = this.createTimer(
      definition.timeout ?? 1000 * 60 * 30,
    )

    const timeoutRace = await Promise.race([
      jobRun.then(result => ({ type: 'runJob', result }) as const),
      jobTimeout.then(() => ({ type: 'timeout' }) as const),
    ])

    let result: SettledJobResult

    if (timeoutRace.type === 'runJob') {
      stopTimer()
      result = timeoutRace.result
    } else {
      await job.abort()
      result = [false, definition, new Error('Job execution timed out')]
    }

    await executor.stop()
    await logger.close()

    return result
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

  private createTimer(ms: number) {
    let timerId: Timer
    const timer = new Promise<void>(
      resolve => (timerId = setTimeout(resolve, ms)),
    )
    const stop = () => clearTimeout(timerId!)

    return { stop, timer }
  }
}
