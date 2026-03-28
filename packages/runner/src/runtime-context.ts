import type { PipelineDefinition } from './pipeline.types'

/**
 * The RuntimeContext is the main source of truth for all the
 * information related to the pipeline execution.
 * It is created by the Provisioner and consumed by the Runner and the PipelineScheduler.
 *
 * @property repoUrl - The URL of the repository to clone
 * @property repoBranch - The branch to clone (optional, defaults to default branch)
 * @property workspacePath - Root directory for pipeline execution (contains repo, logs, artifacts)
 * @property artifactsPath - Directory where pipeline artifacts are stored
 * @property logsPath - Directory where pipeline logs are stored
 * @property appPath - Directory containing the cloned application code
 * @property pipeline - The pipeline definition with jobs and dependencies
 *
 * @example
 * {
 *   repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
 *   repoBranch: 'main',
 *   workspacePath: '/workspace-bdc620cc',
 *   artifactsPath: '/workspace-bdc620cc/artifacts',
 *   logsPath: '/workspace-bdc620cc/logs',
 *   appPath: '/workspace-bdc620cc/app',
 *   pipeline: { name: 'my-pipeline', jobs: [...] },
 * }
 */
export interface RuntimeContext {
  repoUrl: string
  repoBranch?: string
  pipeline: PipelineDefinition
  workspacePath: string
  artifactsPath: string
  logsPath: string
  appPath: string
}
