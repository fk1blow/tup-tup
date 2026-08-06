import type {
  PipelineDefinition,
  PipelineDefinitionSchema,
} from './pipeline.types'

/**
 * RuntimeContext is the single source of truth for pipeline execution.
 * Created by Provisioner, consumed by Runner, Scheduler, and jobs.
 *
 * Paths:
 * - workspace: Ephemeral scratch space of a run(eg: cloned repo; deleted after teardown)
 * - archive: Persistent storage for this run's outputs (logs, artifacts, events)
 *
 * Both paths share a conventional structure:
 *   /app        - cloned repository (workspace only)
 *   /logs       - job output logs
 *   /artifacts  - generated artifacts
 *   events.log  - structured event stream
 *
 * Consumers should never read env vars or construct paths — everything
 * needed is already here.
 */
export interface RuntimeContext {
  id: string
  repository: {
    url: string
    branch?: string
  }
  pipeline: PipelineDefinition
  paths: {
    workspace: string
    data: string
  }
}
