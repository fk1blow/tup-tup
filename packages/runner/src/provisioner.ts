import { YAML } from 'bun'
import { mkdirSync, rmSync, statSync } from 'fs'
import path from 'path'
import type { pipeline } from 'stream'
import { PipelineDefinition } from './pipeline.types'
import type { RuntimeContext } from './runtime-context'

// TODO could also name to ExecutionPlan
interface ExecutionEnvironment {
  runId: string
}

export async function setupProvisioning(repo: {
  user: string
  name: string
  branch?: string
  configPath?: string
}) {
  const runId = crypto.randomUUID()

  const configFile = await fetchConfig(repo)
  const pipeline = await parseConfig(configFile)
  return {
    runId,
    pipeline,
  }
}

async function fetchConfig(repo: {
  user: string
  name: string
  branch?: string
  configPath?: string
}) {
  const serviceUrl = 'https://raw.githubusercontent.com'
  const repoBranch = repo.branch ?? 'main'
  const repoConfigPath = repo.configPath ?? '.tuptup.yml'

  const res = await fetch(
    `${serviceUrl}/${repo.user}/${repo.name}/${repoBranch}/${repoConfigPath}`,
  )
  return await res.text()
}

async function parseConfig(fileContents: string) {
  let parsedFileContents

  try {
    parsedFileContents = YAML.parse(fileContents)
  } catch (err) {
    throw new Error(`Provisioner: Error parsing YML config file: ${err}`)
  }

  const configValidation = PipelineDefinition.safeParse(parsedFileContents)
  if (!configValidation.success)
    throw new Error(
      `Provisioner: Invalid pipeline configuration ${JSON.stringify(configValidation.error.issues)}`,
    )

  return configValidation.data
}
