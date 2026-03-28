import { describe, expect, it } from 'bun:test'
import {
  isPipelineSchedulerJobEvent,
  PipelineSchedulerEventType,
} from '../../src/pipeline-scheduler.types'
import { setupCoordinator } from '../__helpers__/pipeline-scheduler.test-helpers'
import { describeWithWorkspace } from '../__helpers__/workspace-describe'

describeWithWorkspace('PipelineScheduler', './tests/runner', ctx => {
  describe('Scheduling (happy path)', () => {
    it('should run multiple parallel jobs (no dependencies)', async () => {
      const { coordinator } = setupCoordinator(ctx, {
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
        events.push(event)
      }

      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_b',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_b',
          success: true,
          error: undefined,
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: true,
          error: undefined,
        },
      ])
    })
  })

  describe('Dependencies', () => {
    it('should run dependency chain in correct order', async () => {
      const { coordinator } = setupCoordinator(ctx, {
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
        events.push(event)
      }

      const allButLastTwo = events.slice(0, -2)
      const lastTwo = events.slice(-2)

      // Strict order for deterministic part
      expect(allButLastTwo).toEqual([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_c',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_c',
          success: true,
          error: undefined,
        },
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: true,
          error: undefined,
        },
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_b',
        },
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_d',
        },
      ])

      // Last two jobs can be in any order since they run in parallel
      expect(lastTwo).toHaveLength(2)
      const lastTwoJobs = lastTwo.filter(isPipelineSchedulerJobEvent)
      expect(lastTwoJobs.map(e => e.job).sort()).toEqual(['job_b', 'job_d'])
    })

    it('should skip following jobs when dependency fails', async () => {
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
        events.push(event)
      }

      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: false,
          error: undefined,
        },
      ])
    })

    it('should skip entire chain when upstream fails', async () => {
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
          {
            name: 'job_c',
            image: 'busybox',
            commands: [['echo', 'Hello from job_c!']],
            dependsOn: ['job_b'],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      // Only job_a should run; job_b and job_c should be skipped
      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: false,
          error: undefined,
        },
      ])
    })

    it('should handle diamond dependency pattern', async () => {
      const { coordinator } = setupCoordinator(ctx, {
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
            dependsOn: ['job_a'],
          },
          {
            name: 'job_c',
            image: 'busybox',
            commands: [['echo', 'Hello from job_c!']],
            dependsOn: ['job_a'],
          },
          {
            name: 'job_d',
            image: 'busybox',
            commands: [['echo', 'Hello from job_d!']],
            dependsOn: ['job_b', 'job_c'],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      // job_a must complete first
      expect(events[0]).toMatchObject({
        type: PipelineSchedulerEventType.JOB_STARTED,
        pipeline: 'my-pipeline',
        job: 'job_a',
      })
      expect(events[1]).toMatchObject({
        type: PipelineSchedulerEventType.JOB_SETTLED,
        pipeline: 'my-pipeline',
        job: 'job_a',
        success: true,
      })

      // job_b and job_c run in parallel after job_a
      const middleStarted = events
        .slice(2, 4)
        .filter(isPipelineSchedulerJobEvent)
        .map(e => e.job)
        .sort()
      expect(middleStarted).toEqual(['job_b', 'job_c'])

      // job_d must run last
      expect(events[events.length - 1]).toMatchObject({
        type: PipelineSchedulerEventType.JOB_SETTLED,
        pipeline: 'my-pipeline',
        job: 'job_d',
        success: true,
      })
    })
  })

  describe('Timeouts', () => {
    it('should handle a job timing out', async () => {
      const { coordinator } = setupCoordinator(ctx, {
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

      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Job execution timed out'),
          }),
        },
      ])
    })

    it('should complete job before timeout when fast enough', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'my-pipeline',
        jobs: [
          {
            name: 'job_a',
            image: 'busybox',
            commands: [['echo', 'quick job']],
            timeout: 30000, // 30 second timeout
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: true,
          error: undefined,
        },
      ])
    })
  })

  describe('Errors', () => {
    it('should fail job with non-zero exit code', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'my-pipeline',
        jobs: [
          {
            name: 'job_a',
            image: 'busybox',
            commands: [['sh', '-c', 'exit 42']],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: false,
          error: undefined,
        },
      ])
    })

    it('should fail job when docker image not found', async () => {
      const { coordinator } = setupCoordinator(ctx, {
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
        events.push(event)
      }

      expect(events).toMatchObject([
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_a',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_a',
          success: true,
          error: undefined,
        },
        {
          type: PipelineSchedulerEventType.JOB_STARTED,
          pipeline: 'my-pipeline',
          job: 'job_b',
        },
        {
          type: PipelineSchedulerEventType.JOB_SETTLED,
          pipeline: 'my-pipeline',
          job: 'job_b',
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

  describe('Events', () => {
    it('should emit job:started for each job', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'test-pipeline',
        jobs: [
          {
            name: 'job_a',
            image: 'busybox',
            commands: [['echo', 'a']],
          },
          {
            name: 'job_b',
            image: 'busybox',
            commands: [['echo', 'b']],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      const startedEvents = events.filter(
        e => e.type === PipelineSchedulerEventType.JOB_STARTED,
      )
      expect(startedEvents).toHaveLength(2)
      const jobEvents = startedEvents.filter(isPipelineSchedulerJobEvent)
      expect(jobEvents.map(e => e.job).sort()).toEqual(['job_a', 'job_b'])
    })

    it('should emit job:settled with success=true on success', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'test-pipeline',
        jobs: [
          {
            name: 'job_a',
            image: 'busybox',
            commands: [['echo', 'success']],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      const settledEvents = events.filter(
        e => e.type === PipelineSchedulerEventType.JOB_SETTLED,
      )
      expect(settledEvents).toHaveLength(1)
      expect(settledEvents[0]).toMatchObject({
        type: PipelineSchedulerEventType.JOB_SETTLED,
        pipeline: 'test-pipeline',
        job: 'job_a',
        success: true,
        error: undefined,
      })
    })

    it('should emit job:settled with success=false and error on failure', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'test-pipeline',
        jobs: [
          {
            name: 'job_a',
            image: 'inexistent-image-xyz',
            commands: [['echo', 'will fail']],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      const settledEvents = events.filter(
        e => e.type === PipelineSchedulerEventType.JOB_SETTLED,
      )
      expect(settledEvents).toHaveLength(1)
      expect(settledEvents[0]).toMatchObject({
        type: PipelineSchedulerEventType.JOB_SETTLED,
        pipeline: 'test-pipeline',
        job: 'job_a',
        success: false,
        error: expect.any(Object),
      })
    })

    it('should include pipeline name in all events', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'my-unique-pipeline',
        jobs: [
          {
            name: 'job_a',
            image: 'busybox',
            commands: [['echo', 'test']],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      for (const event of events) {
        expect(event.pipeline).toBe('my-unique-pipeline')
      }
    })

    it('should include job name in all job events', async () => {
      const { coordinator } = setupCoordinator(ctx, {
        name: 'test-pipeline',
        jobs: [
          {
            name: 'my-job',
            image: 'busybox',
            commands: [['echo', 'test']],
          },
        ],
      })

      const events = []

      for await (const event of coordinator.schedule()) {
        events.push(event)
      }

      const jobEvents = events.filter(isPipelineSchedulerJobEvent)
      for (const event of jobEvents) {
        expect(event.job).toBe('my-job')
      }
    })
  })
})
