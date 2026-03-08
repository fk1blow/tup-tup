import { YAML } from 'bun'
import { log } from 'console'
import { mkdir, mkdirSync, statSync } from 'fs'
import path from 'path'
import { PipelineDefinition } from './pipeline.types'

export class Provisioner {
  private _repoUrl: string
  private _branch?: string
  private _workspace: string
  private _pipelineConfig: PipelineDefinition | null = null

  constructor(config: { repoUrl: string; workspace: string; branch?: string }) {
    this._repoUrl = config.repoUrl
    this._branch = config.branch
    this._workspace = config.workspace
  }

  get repoUrl() {
    return this._repoUrl
  }

  get workDir() {
    return this._workspace
  }

  get pipelineConfig() {
    return this._pipelineConfig
  }

  async prepare() {
    await this.prepareWorkspace()
    await this.cloneRepo()
    await this.parseConfig()
  }

  private async prepareWorkspace() {
    const repoPath = path.join(this._workspace, 'repo')
    const artifactsPath = path.join(this._workspace, 'artifacts')

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
    const configPath = path.join(this._workspace, 'repo', '.tuptup.yml')

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

    this._pipelineConfig = configValidation.data
  }

  private async cloneRepo() {
    const args = ['git', 'clone']
    if (this._branch) {
      args.push('--branch', this._branch)
    }
    args.push(this._repoUrl, path.join(this._workspace, 'repo'))

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
