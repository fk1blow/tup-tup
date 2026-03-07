import { YAML } from 'bun'
import { log } from 'console'
import { statSync } from 'fs'
import path from 'path'
import { PipelineDefinition } from './pipeline.types'

export class Provisioner {
  private _repoUrl: string
  private _workspace: string
  private _pipelineConfig: PipelineDefinition | null = null

  constructor(config: { repoUrl: string; workspace: string }) {
    this._repoUrl = config.repoUrl
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
    await this.cloneRepo()
    await this.parseConfig()
  }

  private async parseConfig() {
    const configPath = path.join(this._workspace, 'repo', '.tuptup.yml')

    try {
      statSync(configPath)
    } catch (err) {
      throw new Error(`Error accessing config file at ${configPath}: ${err}`)
    }

    const fileContents = await Bun.file(configPath).text()
    const parsedFilteContents = YAML.parse(fileContents)

    const configValidation = PipelineDefinition.safeParse(parsedFilteContents)
    if (!configValidation.success)
      throw new Error('Invalid pipeline configuration', {
        cause: configValidation.error,
      })

    this._pipelineConfig = configValidation.data
  }

  private async cloneRepo() {
    const subprocess = Bun.spawn(
      [
        'docker',
        'run',
        '--rm',
        '-v',
        `${this._workspace}:/workspace`,
        '-w',
        '/workspace',
        'alpine/git',
        'clone',
        this._repoUrl,
        './repo',
      ],
      {
        stdout: 'inherit',
        stderr: 'inherit',
      },
    )

    return await subprocess.exited
  }
}
