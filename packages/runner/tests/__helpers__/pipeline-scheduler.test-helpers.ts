import { DockerExecutor } from '../../src/docker-executor'
import { PipelineScheduler } from '../../src/pipeline-scheduler'
import type { PipelineDefinition } from '../../src/pipeline.types'
import { TestListLogger } from './test-list-logger'
import type { WorkspaceContext } from './workspace-describe'

export const setupCoordinator = (
  ctx: WorkspaceContext,
  pipeline: PipelineDefinition,
): { coordinator: PipelineScheduler } => {
  const coordinator = new PipelineScheduler({
    runtimeCtx: {
      ...ctx,
      pipeline,
    },
    jobsLoggerFactory: () => new TestListLogger(),
    dockerExecutorFactory: (opts: { image: string; name: string }) => {
      return new DockerExecutor({
        name: pipeline.name,
        image: opts.image,
        workspacePath: ctx.workspacePath,
      })
    },
  })

  return { coordinator }
}
