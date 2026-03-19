import EventEmitter from 'node:events'
import { DockerExecutorFactory } from './docker-executor-factory'
import { FileLoggerFactory } from './file-logger-factory'
import { PipelineScheduler } from './pipeline-scheduler'
import { Provisioner } from './provisioner'

export class Runner {
  // These 3(workspace, repoUrl, repoBranch) might also need the path supplied by the system where tuptup is running,
  // so that it can be used to store the workspace.
  // Might come from the .env file or from the CLI args
  private _workspace: string
  private _repoUrl: string
  private _repoBranch?: string

  constructor(opts: {
    repoUrl: string
    repoBranch?: string
    workspace: string
  }) {
    // this._workspace = `/tmp/tup-tup-runner-${Date.now()}`
    this._workspace = opts.workspace
    this._repoUrl = opts.repoUrl
    this._repoBranch = opts.repoBranch
  }

  // TODO i don't like the name of this method, maybe `start` or `execute` would be better
  // or even `executePipeline`
  async run() {
    const provisioner = Provisioner.create({
      repoUrl: this._repoUrl,
      branch: this._repoBranch,
      workspacePath: this._workspace,
    })

    const runtimeCtx = await provisioner.prepare()

    const pipelineScheduler = new PipelineScheduler({
      runtimeCtx,
      fileLoggerFactory: new FileLoggerFactory(runtimeCtx.logsPath),
      dockerExecutorFactory: new DockerExecutorFactory(
        runtimeCtx.workspacePath,
      ),
    })
    // await pipelineScheduler.schedule()
  }
}
