import { DockerExecutor } from '../../src/docker-executor'
import { JobScheduler } from '../../src/job-scheduler'
import type {
  PipelineDefinition,
  PipelineDefinitionSchema,
} from '../../src/pipeline.types'
import { TestListLogger } from './test-list-logger'
import type { WorkspaceContext } from './workspace-describe'

export const setupScheduler = (
  ctx: WorkspaceContext,
  pipeline: PipelineDefinition,
): { scheduler: JobScheduler } => {
  const scheduler = new JobScheduler({
    runtimeCtx: {
      id: ctx.id,
      repository: ctx.repository,
      paths: ctx.paths,
      pipeline,
    },
    jobsLoggerFactory: () => new TestListLogger(),
    dockerExecutorFactory: (opts: { image: string; name: string }) => {
      return new DockerExecutor({
        name: pipeline.name,
        image: opts.image,
        workspacePath: ctx.paths.workspace,
      })
    },
  })

  return { scheduler }
}
