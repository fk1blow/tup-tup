import { YAML } from 'bun'
import { mkdirSync, rmSync, statSync } from 'fs'
import path from 'path'
import { PipelineDefinition } from './pipeline.types'
import type { RuntimeContext } from './runtime-context'

export async function setupProvisioning(opts: {
  repoUrl: string
  repoBranch?: string
}) {
  const runId = crypto.randomUUID()
  const undoFns: (() => void)[] = []

  let workspacePath: string
  let dataPath: string
  let pipeline: PipelineDefinition

  try {
    const setupWorkspaceDirResult = setupWorkspaceDir(runId)
    workspacePath = setupWorkspaceDirResult.workspacePath
    undoFns.push(setupWorkspaceDirResult.undo)

    const setupDataDirResult = setupDataDir(runId)
    dataPath = setupDataDirResult.dataPath
    undoFns.push(setupDataDirResult.undo)

    await cloneRepo(opts.repoUrl, opts.repoBranch, workspacePath)
    pipeline = await parseConfig(setupWorkspaceDirResult.appPath)
  } catch (err) {
    undoFns.forEach(undo => undo())
    throw err
  }

  return {
    id: runId,
    repository: {
      url: opts.repoUrl,
      branch: opts.repoBranch,
    },
    paths: {
      workspace: workspacePath,
      data: dataPath,
    },
    pipeline,
  } as RuntimeContext
}

function setupWorkspaceDir(runId: string) {
  const workspaceRootPath = '/tmp/tuptup'
  const workspacePath = path.join(workspaceRootPath, runId)
  const appPath = path.join(workspacePath, 'app')
  const artifactsPath = path.join(workspacePath, 'artifacts')
  const logsPath = path.join(workspacePath, 'logs')

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

  const undo = () => rmSync(workspacePath, { recursive: true, force: true })

  return { workspacePath, appPath, undo }
}

function setupDataDir(runId: string) {
  const dataRootPath =
    Bun.env.TUP_TUP_DATA_PATH ?? path.join(Bun.env.HOME!, '.tuptup')
  const dataPath = path.join(dataRootPath, runId)

  try {
    mkdirSync(dataPath, { recursive: true })
  } catch (err) {
    throw new Error(
      `Provisioner: Error while attempting to create data artifacts directory at ${dataPath}: ${err}`,
    )
  }

  const artifactsPath = path.join(dataPath, 'artifacts')
  const logsPath = path.join(dataPath, 'logs')

  try {
    mkdirSync(artifactsPath)
  } catch (err) {
    throw new Error(
      `Provisioner: Error while attempting to create data artifacts directory at ${artifactsPath}: ${err}`,
    )
  }

  try {
    mkdirSync(logsPath)
  } catch (err) {
    throw new Error(
      `Provisioner: Error while attempting to create data logs directory at ${logsPath}: ${err}`,
    )
  }

  const undo = () => rmSync(dataPath, { recursive: true, force: true })

  return { dataPath, undo }
}

async function cloneRepo(
  repoUrl: string,
  repoBranch: string | undefined,
  workspacePath: string,
) {
  const args = ['git', 'clone']
  // clone what branch
  if (repoBranch) {
    args.push('--branch', repoBranch)
  }
  // clone where
  args.push(repoUrl, path.join(workspacePath, 'app'))

  const subprocess = Bun.spawn(args, {
    stdout: 'ignore',
    stderr: 'ignore',
  })

  const exitCode = await subprocess.exited

  if (exitCode !== 0) {
    throw new Error(
      `Provisioner: Failed to clone ${repoUrl} repository, exit code ${exitCode}`,
    )
  }

  return exitCode
}

async function parseConfig(appPath: string) {
  const configPath = path.join(appPath, '.tuptup.yml')

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

  return configValidation.data
}
