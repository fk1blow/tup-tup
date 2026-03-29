import { YAML } from 'bun'
import { mkdirSync, statSync } from 'fs'
import path from 'path'
import { PipelineDefinition } from './pipeline.types'
import type { RuntimeContext } from './runtime-context'

type BuildingRuntimeContext = {
  id: string
  repository: {
    url: string
    branch?: string
  }
  paths: {
    workspace: string
    archive?: string
  }
  pipeline?: PipelineDefinition
}

export class Provisioner {
  private _context: BuildingRuntimeContext | RuntimeContext

  get context(): Readonly<BuildingRuntimeContext | RuntimeContext> {
    return this._context
  }

  constructor(opts: {
    repoUrl: string
    repoBranch?: string
  }) {
    const runId = crypto.randomUUID()

    this._context = {
      id: runId,
      repository: {
        url: opts.repoUrl,
        branch: opts.repoBranch,
      },
      paths: {
        workspace: `/tmp/tuptup/${runId}`,
      },
    }
  }

  async setup(): Promise<RuntimeContext> {
    await this.prepareWorkspace()
    await this.prepareArchive()
    await this.cloneRepo()
    await this.parseConfig()

    // TODO implement it and use this(use https://www.npmjs.com/package/dependency-graph)
    // await this.validateCyclicDependencies()

    // We can safely cast the pipeline context to the complete version here
    // If any of the steps above failed, an error would have been thrown
    return this._context as RuntimeContext
  }

  private async prepareWorkspace() {
    const { workspace } = this._context.paths
    const appPath = path.join(workspace, 'app')
    const artifactsPath = path.join(workspace, 'artifacts')
    const logsPath = path.join(workspace, 'logs')

    try {
      mkdirSync(appPath, { recursive: true })
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create workspace app directory at ${appPath}: ${err}`,
      )
    }

    try {
      mkdirSync(artifactsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create workspace artifacts directory at ${artifactsPath}: ${err}`,
      )
    }

    try {
      mkdirSync(logsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create workspace logs directory at ${logsPath}: ${err}`,
      )
    }

    this._context = {
      ...this._context,
      paths: {
        workspace: this._context.paths.workspace,
      },
    }
  }

  private async prepareArchive() {
    const archiveRoot =
      Bun.env.TUP_TUP_RUNS_PATH ?? path.join(Bun.env.HOME!, '.tuptup')
    const archivePath = path.join(archiveRoot, this._context.id)

    try {
      mkdirSync(archivePath, { recursive: true })
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create archive artifacts directory at ${archivePath}: ${err}`,
      )
    }

    const artifactsPath = path.join(archivePath, 'artifacts')
    const logsPath = path.join(archivePath, 'logs')

    try {
      mkdirSync(artifactsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create archive artifacts directory at ${artifactsPath}: ${err}`,
      )
    }

    try {
      mkdirSync(logsPath)
    } catch (err) {
      throw new Error(
        `Provisioner: Error while attempting to create archive logs directory at ${logsPath}: ${err}`,
      )
    }

    this._context = {
      ...this._context,
      paths: {
        ...this._context.paths,
        archive: archivePath,
      },
    }
  }

  private async cloneRepo() {
    const args = ['git', 'clone']
    // clone what branch
    if (this._context.repository.branch) {
      args.push('--branch', this._context.repository.branch)
    }
    // clone where
    args.push(
      this._context.repository.url,
      path.join(this._context.paths.workspace, 'app'),
    )

    const subprocess = Bun.spawn(args, {
      stdout: 'ignore',
      stderr: 'ignore',
    })

    const exitCode = await subprocess.exited

    if (exitCode !== 0) {
      throw new Error(
        `Provisioner: Failed to clone repository from ${this._context.repository.url} with exit code ${exitCode}`,
      )
    }

    return exitCode
  }

  private async parseConfig() {
    const configPath = path.join(
      this._context.paths.workspace,
      'app',
      '.tuptup.yml',
    )

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

    this._context = {
      ...this._context,
      pipeline: configValidation.data,
    }
  }
}
