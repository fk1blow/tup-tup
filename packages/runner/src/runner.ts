import path from 'node:path'
import { DockerExecutor } from './docker-executor'
import { EventsLogger } from './events-logger'
import { JobsLogger } from './jobs-logger'
import { PipelineScheduler } from './pipeline-scheduler'
import { Provisioner } from './provisioner'

export class Runner {
  // These 3(workspace, repoUrl, repoBranch) might also need the path supplied by the system where tuptup is running,
  // so that it can be used to store the workspace.
  // Might come from the .env file or from the CLI args
  private _workspace: string
  private _repoUrl: string
  private _repoBranch?: string
  // private _eventsLogger: Logger

  constructor(opts: {
    repoUrl: string
    repoBranch?: string
    workspace: string
  }) {
    // this._workspace = `/tmp/tup-tup-runner-${Date.now()}`
    this._workspace = opts.workspace
    this._repoUrl = opts.repoUrl
    this._repoBranch = opts.repoBranch
    // this._eventsLogger = new FileLogger(
    //   path.join(this._workspace, 'events.log'),
    // )
  }

  async start() {
    const provisioner = new Provisioner({
      repoUrl: this._repoUrl,
      repoBranch: this._repoBranch,
      workspacePath: this._workspace,
    })

    const runtimeCtx = await provisioner.prepare()

    const pipelineScheduler = new PipelineScheduler({
      runtimeCtx,
      jobsLoggerFactory: (logFilePath: string) => new JobsLogger(logFilePath),
      dockerExecutorFactory: (opts: {
        workspacePath: string
        image: string
        name: string
      }) => new DockerExecutor(opts),
    })

    const eventsLogger = new EventsLogger(path.join(this._workspace, 'events'))

    for await (const event of pipelineScheduler.schedule()) {
      await eventsLogger.log(event)
    }

    // TODO add the teardown logic here
  }

  private async teardown() {
    // TODO add the teardown logic here, like removing the workspace and all the logs/artifacts
  }
}
