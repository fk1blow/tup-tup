import { YAML } from 'bun'
import { mkdirSync, statSync } from 'fs'
import path from 'path'
import { PipelineDefinition } from './pipeline.types'
import type { RuntimeContext } from './runtime-context'

type IncompleteRuntimeContext = Omit<
  RuntimeContext,
  'pipeline' | 'artifactsPath' | 'logsPath' | 'repoPath' | 'appPath'
> & {
  pipeline?: PipelineDefinition
}

// TODO need to check the job definitions cyclic dependencies here as well
// use https://www.npmjs.com/package/dependency-graph
export class Provisioner {
  private _repoUrl: string
  private _branch?: string
  private _workspacePath: string
  private _runtimeCtx: IncompleteRuntimeContext | RuntimeContext

  constructor(opts: {
    repoUrl: string
    workspacePath: string
    branch?: string
  }) {
    this._repoUrl = opts.repoUrl
    this._branch = opts.branch
    this._workspacePath = opts.workspacePath

    this._runtimeCtx = {
      repoUrl: this._repoUrl,
      repoBranch: this._branch,
      workspacePath: this._workspacePath,
    }
  }

  // Why do we need this?
  // TODO find out why we need this static method
  static create(
    opts: ConstructorParameters<typeof Provisioner>[0],
  ): Provisioner {
    return new Provisioner(opts)
  }

  // TODO rename to `provision` or (leaning towards)`setup`()
  async prepare(): Promise<RuntimeContext> {
    await this.prepareWorkspace()
    await this.cloneRepo()
    await this.parseConfig()
    // TODO implement it and use this(use https://www.npmjs.com/package/dependency-graph)
    // await this.validateCyclicDependencies()

    // We can safely cast the pipeline context to the complete version here
    // If any of the steps above failed, an error would have been thrown
    return this._runtimeCtx as RuntimeContext
  }

  private async prepareWorkspace() {
    const appPath = path.join(this._workspacePath, 'app')
    const artifactsPath = path.join(this._workspacePath, 'artifacts')
    const logsPath = path.join(this._workspacePath, 'logs')

    try {
      mkdirSync(appPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create repo directory at ${appPath}: ${err}`,
      )
    }

    try {
      mkdirSync(artifactsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create artifacts directory at ${artifactsPath}: ${err}`,
      )
    }

    try {
      mkdirSync(logsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create logs directory at ${logsPath}: ${err}`,
      )
    }

    this._runtimeCtx = {
      ...this._runtimeCtx,
      artifactsPath,
      logsPath,
      appPath,
    }
  }

  private async parseConfig() {
    const configPath = path.join(this._workspacePath, 'app', '.tuptup.yml')

    try {
      statSync(configPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error accessing config file at ${configPath}: ${err}`,
      )
    }

    const fileContents = await Bun.file(configPath).text()
    let parsedFileContents

    try {
      parsedFileContents = YAML.parse(fileContents)
    } catch (err) {
      throw new Error(
        `Provisioner: Error parsing YML config file at ${configPath}: ${err}`,
      )
    }

    const configValidation = PipelineDefinition.safeParse(parsedFileContents)
    if (!configValidation.success)
      throw new Error(
        `Provisioner: Invalid pipeline configuration ${JSON.stringify(configValidation.error.issues)}`,
      )

    this._runtimeCtx = {
      ...this._runtimeCtx,
      pipeline: configValidation.data,
    }
  }

  private async cloneRepo() {
    const args = ['git', 'clone']
    if (this._branch) {
      args.push('--branch', this._branch)
    }
    args.push(this._repoUrl, path.join(this._workspacePath, 'app'))

    const subprocess = Bun.spawn(args, {
      stdout: 'ignore',
      stderr: 'ignore',
    })

    const exitCode = await subprocess.exited

    if (exitCode !== 0) {
      throw new Error(
        `Provisioner: Failed to clone repository from ${this._repoUrl} with exit code ${exitCode}`,
      )
    }

    return exitCode
  }
}
