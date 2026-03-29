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
  let archivePath: string
  let pipeline: PipelineDefinition

  try {
    const setupWorkspaceResult = setupWorkspaceDir(runId)
    workspacePath = setupWorkspaceResult.workspacePath
    undoFns.push(setupWorkspaceResult.undo)

    const setupArchiveResult = setupArchiveDir(runId)
    archivePath = setupArchiveResult.archivePath
    undoFns.push(setupArchiveResult.undo)

    await cloneRepo(opts.repoUrl, opts.repoBranch, workspacePath)
    pipeline = await parseConfig(setupWorkspaceResult.appPath)
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
      archive: archivePath,
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

function setupArchiveDir(runId: string) {
  const archiveRootPath =
    Bun.env.TUP_TUP_RUNS_PATH ?? path.join(Bun.env.HOME!, '.tuptup')
  const archivePath = path.join(archiveRootPath, runId)

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

  const undo = () => rmSync(archivePath, { recursive: true, force: true })

  return { archivePath, undo }
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
