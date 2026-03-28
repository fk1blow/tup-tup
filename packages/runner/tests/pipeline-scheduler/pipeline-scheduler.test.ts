import { expect, it } from 'bun:test'
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
        job: 'job_c',
      },
      {
        type: 'settled',
        job: 'job_c',
        success: true,
        error: undefined,
      },
      {
        type: 'started',
        job: 'job_a',
      },
      {
        type: 'settled',
        job: 'job_a',
        success: true,
        error: undefined,
      },
      {
        type: 'started',
        job: 'job_b',
      },
      {
        type: 'started',
        job: 'job_d',
      },
    ])

    // Last two jobs can be in any order since they run in parallel
    expect(lastTwo).toHaveLength(2)
    expect(lastTwo.map(e => e.job).sort()).toEqual(['job_b', 'job_d'])
  })

  it('should skip following jobs after a dependant failed', async () => {
    const { coordinator } = setupCoordinator(ctx, {
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
        type: 'job:started',
        pipeline: 'my-pipeline',
        job: 'job_a',
      },
      {
        type: 'job:settled',
        pipeline: 'my-pipeline',
        job: 'job_a',
        success: false,
        error: undefined,
      },
    ])
  })

  it.only('should handle a job timing out', async () => {
    const { coordinator, jobsLogger } = setupCoordinator(ctx, {
      name: 'my-pipeline',
      jobs: [
        {
          name: 'job_a',
          image: 'busybox',
          commands: [
            ['echo', 'first command'],
            ['sh', '-c', 'sleep 5'],
          ],
          timeout: 1000, // 1 second timeout
        },
      ],
    })

    const events = []

    for await (const event of coordinator.schedule()) {
      events.push(event)
    }

    console.log('events:', events)
    // console.log('jobsLogger:', jobsLogger.logs)

    expect(events).toMatchObject([
      {
        type: 'job:started',
        pipeline: 'my-pipeline',
        job: 'job_a',
      },
      {
        type: 'job:settled',
        pipeline: 'my-pipeline',
        job: 'job_a',
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining('Job execution timed out'),
        }),
      },
    ])
  })

  it('should see errors???', async () => {
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
  const jobsLogger = new TestListLogger()
  const coordinator = new PipelineScheduler({
    runtimeCtx: {
      ...ctx,
      pipeline,
    },
    jobsLoggerFactory: () => jobsLogger,
    dockerExecutorFactory: (opts: { image: string; name: string }) => {
      return new DockerExecutor({
        name: pipeline.name,
        image: opts.image,
        workspacePath: ctx.workspacePath,
      })
    },
  })

  return { coordinator, jobsLogger }
}
