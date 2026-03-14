import EventEmitter from 'node:events'
import { DockerExecutorFactory } from './docker-executor-factory'
import { EventEmitterReporter } from './event-emitter-reporter'
import { EventEmitterReporterFactory } from './event-emitter-reporter-factory'
import { FileLoggerFactory } from './file-logger-factory'
import { JobCoordinator } from './job-coordinator'
import type { JobEventMap } from './job.types'
import { Provisioner } from './provisioner'

export class Runner {
  // These 3(workspace, repoUrl, repoBranch) might also need the path supplied by the system where tuptup is running,
  // so that it can be used to store the workspace.
  // Might come from the .env file or from the CLI args
  private _workspace: string
  private _repoUrl: string
  private _repoBranch?: string

  private _emitter: EventEmitter

  constructor(opts: {
    repoUrl: string
    repoBranch?: string
    workspace: string
  }) {
    // this._workspace = `/tmp/tup-tup-runner-${Date.now()}`
    this._workspace = opts.workspace
    this._repoUrl = opts.repoUrl
    this._repoBranch = opts.repoBranch
    // The emitter could be used with some other events as well,
    // not just the ones from the Job class: provisioning events, workflow events, etc
    this._emitter = new EventEmitter<JobEventMap>()
  }

  async run() {
    const provisioner = Provisioner.create({
      repoUrl: this._repoUrl,
      branch: this._repoBranch,
      workspacePath: this._workspace,
    })

    const runtimeCtx = await provisioner.prepare()

    const jobCoordinator = new JobCoordinator({
      runtimeCtx,
      jobReporter: new EventEmitterReporter(this._emitter),
      fileLoggerFactory: new FileLoggerFactory(runtimeCtx.logsPath),
      dockerExecutorFactory: new DockerExecutorFactory(
        runtimeCtx.workspacePath,
      ),
    })
    await jobCoordinator.run()
  }
}
