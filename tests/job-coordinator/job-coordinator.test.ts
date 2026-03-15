import { expect, it, test } from 'bun:test'
import { DockerExecutor } from '../../src/docker-executor'
import { JobCoordinator } from '../../src/job-coordinator'
import type { JobDefinition } from '../../src/job.types'
import type { PipelineDefinition } from '../../src/pipeline.types'
import { TestEventsReporter } from '../__helpers__/test-events-reporter'
import { TestListLogger } from '../__helpers__/test-list-logger'
import { describeWithWorkspace } from '../__helpers__/workspace-describe'

describeWithWorkspace('Job Coordinator', './tests/runner', ctx => {
  it('should handle a single job pipeline', async () => {
    const pipeline: PipelineDefinition = {
      name: 'pipeline',
      jobs: [
        {
          name: 'job_a',
          image: 'node:alpine',
          commands: [['echo "Hello from job_a!"']],
        },
        // {
        //   name: 'job_b',
        //   image: 'node:alpine',
        //   commands: [['echo "Hello from job_b!"']],
        // },
        // {
        //   name: 'job_c',
        //   image: 'node:alpine',
        //   commands: [['echo "Hello from job_c!"']],
        //   dependsOn: ['job_a'],
        // },
      ],
    }

    const logger = new TestListLogger()

    const reporter = new TestEventsReporter(logger)

    const executor = new DockerExecutor({
      pipelineName: 'pipeline',
      image: 'node:alpine',
      workspacePath: ctx.workspacePath,
    })

    const coordinator = new JobCoordinator({
      runtimeCtx: {
        ...ctx,
        definition: {
          name: 'my-pipeline',
          jobs: [
            {
              name: 'test',
              image: 'node:alpine',
              commands: [['echo "Hello, World!"']],
            },
          ],
        },
      },
      jobReporter: reporter,
      fileLoggerFactory: { create: () => logger },
      dockerExecutorFactory: { create: () => executor },
    })
    // console.log('ctx:', ctx)

    expect(true).toBe(true)
  })
})
