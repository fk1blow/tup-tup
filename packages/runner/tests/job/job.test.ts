import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import {
  filterRunningContainers,
  removeContainerByName,
} from '../__helpers__/executor.test-helpers'
import { setupJob, setupJobSelfTeardown } from '../__helpers__/job.test-helpers'
import {
  setupWorkspaceIn,
  teardownWorkspaceIn,
} from '../__helpers__/workspace.test-helpers'

describe('Job', () => {
  afterAll(async () => {
    const runningContainers = await filterRunningContainers('tuptup')
    for (const container of runningContainers) {
      await removeContainerByName(container)
    }
  })

  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspaceIn('./tests/runner')
  })

  afterEach(() => {
    teardownWorkspaceIn(workspacePath)
  })

  describe('Validation', () => {
    test('rejects empty commands', async () => {
      expect(
        setupJobSelfTeardown(
          {
            name: 'Test Job',
            commands: [],
            image: 'node:alpine',
          },
          workspacePath,
        ),
      ).rejects.toThrow('At least one command is required')
    })
  })

  describe('Exited', () => {
    test('single command success', async () => {
      const {
        jobResult: [success, jobDefinition],
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['echo', 'hello world']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(true)
      expect(jobDefinition).toEqual({
        name: 'Test Job',
        commands: [['echo', 'hello world']],
        image: 'node:alpine',
      })
    })

    test('multiple commands success', async () => {
      const {
        jobResult: [success, jobDefinition],
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            ['echo', 'hello world'],
            ['sleep', '0.1'],
            ['echo', 'goodbye'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(true)
      expect(jobDefinition).toEqual({
        name: 'Test Job',
        commands: [
          ['echo', 'hello world'],
          ['sleep', '0.1'],
          ['echo', 'goodbye'],
        ],
        image: 'node:alpine',
      })
    })

    test('non-zero exit code fails job', async () => {
      const {
        jobResult: [success, jobDefinition],
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['sh', '-c', 'exit 1']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(false)
    })

    test('mid-sequence failure stops job', async () => {
      const {
        jobResult: [success],
        logs,
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            ['echo', 'first'],
            ['sh', '-c', 'exit 1'],
            ['echo', 'should-not-appear'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(false)
      expect(logs).toContain('first')
      expect(logs).not.toContain('should-not-appear')
    })

    test('kill signal (SIGTERM) fails job', async () => {
      const {
        jobResult: [success],
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          // 1-127 = process failed
          // 128+ = killed by signal (128 + signal number)
          commands: [['sh', '-c', 'kill -TERM $$']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(false)
    })

    test('kill signal mid-sequence stops job', async () => {
      const {
        jobResult: [success],
        logs,
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            ['echo', 'first'],
            // 1-127 = process failed
            // 128+ = killed by signal (128 + signal number)
            ['sh', '-c', 'kill -TERM $$'],
            ['echo', 'should-not-appear'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(false)
      expect(logs).toContain('first')
      expect(logs).not.toContain('should-not-appear')
    })
  })

  describe('Command not found', () => {
    test('command not found', async () => {
      const {
        jobResult: [success, jobDefinition],
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          // 1-127 = process failed
          // 128+ = killed by signal (128 + signal number)
          commands: [['nonexistent-command-xyz']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(false)
    })

    test('mid-sequence stops job', async () => {
      const {
        jobResult: [success],
        logs,
      } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            ['echo', 'first'],
            // 1-127 = process failed
            // 128+ = killed by signal (128 + signal number)
            ['nonexistent-command-xyz'],
            ['echo', 'should-not-appear'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(success).toBe(false)
      expect(logs).toContain('first')
      expect(logs).not.toContain('should-not-appear')
    })
  })

  describe.skip('StreamError', () => {
    test.skip('deferred - hard to simulate', async () => {
      // StreamError requires forcing a pipe failure
      // See discussion: dependency injection or unit test approach
    })
  })

  describe('Logging', () => {
    test('logs stdout correctly', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            ['echo', 'hello'],
            ['echo', 'world'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs).toEqual(['hello', 'world'])
    })

    test('logs stderr correctly', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            ['sh', '-c', 'echo "error message" >&2'],
            ['echo', 'hello after an error message'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs).toEqual(['error message', 'hello after an error message'])
    })

    test('logs stdout and stderr merged', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['sh', '-c', 'echo "out"; echo "err" >&2; echo "out2"']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      // All output should be captured (order may vary due to stream merging)
      expect(logs).toContain('out')
      expect(logs).toContain('err')
      expect(logs).toContain('out2')
      expect(logs).toHaveLength(3)
    })

    test('no output produces empty logs', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['true']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs).toEqual([])
    })

    test('logs captured on failure', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['sh', '-c', 'echo "dying"; exit 1']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs).toContain('dying')
    })

    test('multi-line output from single command', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['printf', 'a\\nb\\nc']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs).toEqual(['a', 'b', 'c'])
    })

    test('large output (1000 lines)', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['seq', '1', '10000']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs.length).toBeGreaterThanOrEqual(10000)
      expect(logs[0]).toBe('1')
      expect(logs[9999]).toBe('10000')
    })

    test('rapid burst output', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [['sh', '-c', 'for i in $(seq 1 100); do echo $i; done']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      expect(logs).toHaveLength(100)
      expect(logs[0]).toBe('1')
      expect(logs[99]).toBe('100')
    })

    test('interleaved stdout and stderr under load', async () => {
      const { logs } = await setupJobSelfTeardown(
        {
          name: 'Test Job',
          commands: [
            [
              'sh',
              '-c',
              'for i in $(seq 1 50); do echo "out$i"; echo "err$i" >&2; done',
            ],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      // Should capture all 100 lines (50 stdout + 50 stderr)
      expect(logs).toHaveLength(100)

      // Verify both streams are captured
      const outLines = logs.filter(l => l.startsWith('out'))
      const errLines = logs.filter(l => l.startsWith('err'))
      expect(outLines).toHaveLength(50)
      expect(errLines).toHaveLength(50)
    })
  })

  describe('Abort', () => {
    test('abort stops job mid-execution', async () => {
      const { job, logger, teardown } = await setupJob(
        {
          name: 'Test Job',
          commands: [
            ['echo', 'first'],
            ['sleep', '60'],
            ['echo', 'should-not-appear'],
          ],
          image: 'node:alpine',
        },
        workspacePath,
      )

      const runPromise = job.run()

      await new Promise(resolve => setTimeout(resolve, 1000))

      await job.abort()

      const [success] = await runPromise

      await teardown()

      expect(success).toBe(false)
      expect(logger.logs).toContain('first')
      expect(logger.logs).not.toContain('should-not-appear')
    })

    test('abort on completed job is a no-op', async () => {
      const { job, logger, teardown } = await setupJob(
        {
          name: 'Test Job',
          commands: [['echo', 'done']],
          image: 'node:alpine',
        },
        workspacePath,
      )

      const [success] = await job.run()

      await job.abort()

      await teardown()

      expect(success).toBe(true)
      expect(logger.logs).toContain('done')
    })
  })
})
