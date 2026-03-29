import path from 'node:path'
import { DockerExecutor } from './docker-executor'
import { EventsLogger } from './events-logger'
import { JobsLogger } from './jobs-logger'
import { PipelineScheduler } from './pipeline-scheduler'
import { Provisioner } from './provisioner'

export class Runner {
  readonly provisioner: Provisioner

  constructor(opts: {
    repoUrl: string
    repoBranch?: string
  }) {
    this.provisioner = new Provisioner({
      repoUrl: opts.repoUrl,
      repoBranch: opts.repoBranch,
    })
  }

  async start() {
    const runtimeCtx = await this.provisioner.setup()

    const pipelineScheduler = new PipelineScheduler({
      runtimeCtx,
      jobsLoggerFactory: (logFilePath: string) => new JobsLogger(logFilePath),
      dockerExecutorFactory: (opts: {
        workspacePath: string
        image: string
        name: string
      }) => new DockerExecutor(opts),
    })

    const eventsLogger = new EventsLogger(path.join(runtimeCtx.paths.archive, 'events'))

    eventsLogger.log({
      type: 'run:started',
      pipeline: runtimeCtx.pipeline.name,
    })

    // TODO wrap in try/catch
    for await (const event of pipelineScheduler.schedule()) {
      await eventsLogger.log(event)
    }

    // TODO this should come after the teardown
    eventsLogger.log({
      type: 'run:finished',
      pipeline: runtimeCtx.pipeline.name,
    })

    eventsLogger.close()

    // TODO add the teardown logic here
  }

  private async teardown() {
    // TODO add the teardown logic here, like removing the workspace and all the logs/artifacts
  }
}
