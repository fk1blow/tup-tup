import { expect, it } from 'bun:test'
import { name } from 'node:assert'
import { type } from 'node:os'
import { DockerExecutor } from '../../src/docker-executor'
import { PipelineScheduler } from '../../src/pipeline-scheduler'
import type { PipelineDefinition } from '../../src/pipeline.types'
import { TestListLogger } from '../__helpers__/test-list-logger'
import {
  describeWithWorkspace,
  type WorkspaceContext,
} from '../__helpers__/workspace-describe'

describeWithWorkspace('Pipline Scheduler', './tests/runner', ctx => {
  it('should handle a simple parallel job pipeline', async () => {
    console.time('------------')

    const coordinator = setupCoordinator(ctx, {
      name: 'my-pipeline',
      jobs: [
        {
          name: 'job_a',
          image: 'busybox',
          commands: [
            ['sleep', '1'],
            ['echo', 'Hello from job_a!'],
          ],
        },
        {
          name: 'job_b',
          image: 'busybox',
          commands: [['echo', 'Hello from job_b!']],
        },
      ],
    })

    const events = []

    for await (const event of coordinator.schedule()) {
      // console.log('event:', event)
      events.push(event)
    }

    expect(events).toMatchObject([
      {
        type: 'started',
        name: 'job_a',
      },
      {
        type: 'started',
        name: 'job_b',
      },
      {
        type: 'settled',
        name: 'job_b',
        success: true,
        error: undefined,
      },
      {
        type: 'settled',
        name: 'job_a',
        success: true,
        error: undefined,
      },
    ])
  })

  it('should handle a simple dependant job pipeline', async () => {
    const coordinator = setupCoordinator(ctx, {
      name: 'my-pipeline',
      jobs: [
        {
          name: 'job_b',
          image: 'busybox',
          commands: [['echo', 'Hello from job_b!']],
          dependsOn: ['job_a'],
        },
        {
          name: 'job_a',
          image: 'busybox',
          commands: [['echo', 'Hello from job_a!']],
          dependsOn: ['job_c'],
        },
        {
          name: 'job_c',
          image: 'busybox',
          commands: [['sleep', '0.5']],
        },

        {
          name: 'job_d',
          image: 'busybox',
          commands: [['echo', 'Hello from job_d!']],
          dependsOn: ['job_a', 'job_c'],
        },
      ],
    })

    const events = []

    for await (const event of coordinator.schedule()) {
      // console.log('event:', event)
      events.push(event)
    }

    const allButLastTwo = events.slice(0, -2)
    const lastTwo = events.slice(-2)

    // Strict order for deterministic part
    expect(allButLastTwo).toEqual([
      {
        type: 'started',
        name: 'job_c',
      },
      {
        type: 'settled',
        name: 'job_c',
        success: true,
        error: undefined,
      },
      {
        type: 'started',
        name: 'job_a',
      },
      {
        type: 'settled',
        name: 'job_a',
        success: true,
        error: undefined,
      },
      {
        type: 'started',
        name: 'job_b',
      },
      {
        type: 'started',
        name: 'job_d',
      },
    ])

    // Last two jobs can be in any order since they run in parallel
    expect(lastTwo).toHaveLength(2)
    expect(lastTwo.map(e => e.name).sort()).toEqual(['job_b', 'job_d'])
  })

  it('should skip following jobs after a dependant failed', async () => {
    const coordinator = setupCoordinator(ctx, {
      name: 'my-pipeline',
      jobs: [
        {
          name: 'job_a',
          image: 'busybox',
          commands: [['sh', '-c', 'exit 1']],
        },
        {
          name: 'job_b',
          image: 'busybox',
          commands: [['echo', 'Hello from job_b!']],
          dependsOn: ['job_a'],
        },
      ],
    })

    const events = []

    for await (const event of coordinator.schedule()) {
      // console.log('event:', event)
      events.push(event)
    }

    expect(events).toMatchObject([
      {
        type: 'started',
        name: 'job_a',
      },
      {
        type: 'settled',
        name: 'job_a',
        success: false,
        error: undefined,
      },
    ])
  })

  it.only('should see errors???', async () => {
    const coordinator = setupCoordinator(ctx, {
      name: 'my-pipeline',
      jobs: [
        {
          name: 'job_a',
          image: 'busybox',
          commands: [['echo', 'hello world']],
        },
        {
          name: 'job_b',
          image: 'inexistent-image',
          commands: [['echo', 'Hello from job_b!']],
          dependsOn: ['job_a'],
        },
      ],
    })

    const events = []

    for await (const event of coordinator.schedule()) {
      // console.log('event:', event)
      events.push(event)
    }

    expect(events).toMatchObject([
      {
        type: 'started',
        name: 'job_a',
      },
      {
        type: 'settled',
        name: 'job_a',
        success: true,
        error: undefined,
      },
      {
        type: 'started',
        name: 'job_b',
      },
      {
        type: 'settled',
        name: 'job_b',
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining(
            "Unable to find image 'inexistent-image:latest' locally",
          ),
        }),
      },
    ])
  })
})

function setupCoordinator(ctx: WorkspaceContext, pipeline: PipelineDefinition) {
  const coordinator = new PipelineScheduler({
    runtimeCtx: {
      ...ctx,
      pipeline,
    },
    fileLoggerFactory: { create: () => new TestListLogger() },
    dockerExecutorFactory: {
      create: (opts: { image: string; name: string }) => {
        return new DockerExecutor({
          pipelineName: pipeline.name,
          image: opts.image,
          workspacePath: ctx.workspacePath,
        })
      },
    },
  })

  return coordinator
}
