import { YAML } from 'bun'
import { mkdirSync, statSync } from 'fs'
import path from 'path'
import { PipelineDefinition, type PipelineContext } from './pipeline.types'

type IncompletePipelineContext = Omit<PipelineContext, 'definition'> & {
  definition?: PipelineDefinition
}

export class Provisioner {
  private _repoUrl: string
  private _branch?: string
  private _workspacePath: string
  private _artifactsPath: string
  private _pipelineContext: IncompletePipelineContext | PipelineContext

  constructor(opts: {
    repoUrl: string
    workspacePath: string
    branch?: string
  }) {
    this._repoUrl = opts.repoUrl
    this._branch = opts.branch
    this._workspacePath = opts.workspacePath
    this._artifactsPath = path.join(opts.workspacePath, 'artifacts')
    this._pipelineContext = {
      repoUrl: this._repoUrl,
      repoBranch: this._branch,
      workspacePath: this._workspacePath,
      artifactsPath: this._artifactsPath,
    }
  }

  static create(
    opts: ConstructorParameters<typeof Provisioner>[0],
  ): Provisioner {
    return new Provisioner(opts)
  }

  async prepare() {
    await this.prepareWorkspace()
    await this.cloneRepo()
    await this.parseConfig()
    // We can safely cast the pipeline context to the complete version here
    // If any of the steps above failed, an error would have been thrown
    return this._pipelineContext as PipelineContext
  }

  private async prepareWorkspace() {
    const repoPath = path.join(this._workspacePath, 'repo')
    const artifactsPath = path.join(this._workspacePath, 'artifacts')

    try {
      mkdirSync(repoPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create repo directory at ${repoPath}: ${err}`,
      )
    }

    try {
      mkdirSync(artifactsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create artifacts directory at ${artifactsPath}: ${err}`,
      )
    }
  }

  private async parseConfig() {
    const configPath = path.join(this._workspacePath, 'repo', '.tuptup.yml')

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

    this._pipelineContext = {
      ...this._pipelineContext,
      definition: configValidation.data,
    }
  }

  private async cloneRepo() {
    const args = ['git', 'clone']
    if (this._branch) {
      args.push('--branch', this._branch)
    }
    args.push(this._repoUrl, path.join(this._workspacePath, 'repo'))

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
