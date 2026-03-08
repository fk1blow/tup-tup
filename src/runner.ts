import EventEmitter from 'node:events'
import type { JobEventMap } from './job.types'
import { Provisioner } from './provisioner'
import { Workflow } from './workflow'

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
    // TODO this emitter could be used with some other events as well,
    // not just the ones from the Job class: provisioning events, workflow events, etc
    this._emitter = new EventEmitter<JobEventMap>()
  }

  async run() {
    const provisioner = Provisioner.create({
      repoUrl: this._repoUrl,
      branch: this._repoBranch,
      workspacePath: this._workspace,
    })

    const pipelineCtx = await provisioner.prepare()

    const workflow = new Workflow(pipelineCtx, this._emitter)
    await workflow.run()
  }
}
