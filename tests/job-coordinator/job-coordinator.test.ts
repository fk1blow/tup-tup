import { expect, it } from 'bun:test'
import { DockerExecutor } from '../../src/docker-executor'
import { JobCoordinator } from '../../src/job-coordinator'
import type { PipelineDefinition } from '../../src/pipeline.types'
import { TestEventsReporter } from '../__helpers__/test-events-reporter'
import { TestListLogger } from '../__helpers__/test-list-logger'
import {
  describeWithWorkspace,
  type WorkspaceContext,
} from '../__helpers__/workspace-describe'

describeWithWorkspace('Job Coordinator', './tests/runner', ctx => {
  it('should handle a simple parallel job pipeline', async () => {
    const { coordinator, reporter } = setupCoordinator(ctx, {
      name: 'my-pipeline',
      jobs: [
        {
          name: 'job_a',
          image: 'busybox',
          commands: [['echo', 'Hello from job_a!']],
        },
        {
          name: 'job_b',
          image: 'busybox',
          commands: [['echo', 'Hello from job_b!']],
        },
      ],
    })

    await coordinator.run()

    // console.log('ctx:', ctx)
    // console.log('reporter:', reporter.events)

    expect(reporter.events.length).toBe(8)
  })

  it('should handle a simple dependant job pipeline', async () => {
    const { coordinator, reporter } = setupCoordinator(ctx, {
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

    await coordinator.run()

    const events = reporter.events

    expect(events.length).toBe(16)
    expect(events[0]).toMatchObject({ jobName: 'job_c', type: 'job:started' })
    expect(events[4]).toMatchObject({ jobName: 'job_a', type: 'job:started' })
    expect(events.findIndex(e => e.jobName === 'job_b')).toBeGreaterThan(
      events.findIndex(e => e.jobName === 'job_a'),
    )
    expect(events.findIndex(e => e.jobName === 'job_d')).toBeGreaterThan(
      events.findIndex(e => e.jobName === 'job_a'),
    )
    expect(events.findIndex(e => e.jobName === 'job_d')).toBeGreaterThan(
      events.findIndex(e => e.jobName === 'job_c'),
    )
  })
})

function setupCoordinator(ctx: WorkspaceContext, pipeline: PipelineDefinition) {
  const reporter = new TestEventsReporter()

  const coordinator = new JobCoordinator({
    runtimeCtx: {
      ...ctx,
      pipeline,
    },
    jobReporter: reporter,
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

  return {
    coordinator,
    reporter,
  }
}
