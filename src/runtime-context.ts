import type { PipelineDefinition } from './pipeline.types'

export interface RuntimeContext {
  repoUrl: string
  repoBranch?: string
  definition: PipelineDefinition
  workspacePath: string
  artifactsPath: string
  logsPath: string
  appPath: string
}
