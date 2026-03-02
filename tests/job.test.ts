import { describe, expect, test } from 'bun:test'
import {
  commandFinished,
  commandStarted,
  findMessage,
  jobFinished,
  jobStarted,
  runJob,
} from './job.test-helpers'

describe('Job', () => {
  describe('Validation', () => {
    test('rejects empty commands', async () => {
      expect(
        runJob({
          name: 'Test Job',
          commands: [],
          image: 'node:alpine',
        }),
      ).rejects.toThrow('At least one command is required')
    })
  })

  describe('Exited', () => {
    test('single command success', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['echo', 'hello world']],
        image: 'node:alpine',
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, { exitCode: 0 }),
        jobFinished('Test Job', true),
      ])
    })

    test('multiple commands success', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello world'],
          ['sleep', '0.1'],
          ['echo', 'goodbye'],
        ],
        image: 'node:alpine',
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, { exitCode: 0 }),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, { exitCode: 0 }),
        commandStarted('Test Job', 2),
        commandFinished('Test Job', 2, { exitCode: 0 }),
        jobFinished('Test Job', true),
      ])
    })

    test('non-zero exit code fails job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'exit 1']],
        image: 'node:alpine',
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, { exitCode: 1 }),
        jobFinished('Test Job', false),
      ])
    })

    test('preserves custom exit code', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'exit 42']],
        image: 'node:alpine',
      })

      const finishedMsg = findMessage(events, 'command:finished')
      expect(finishedMsg?.result).toEqual({ exitCode: 42 })
    })

    test('mid-sequence failure stops job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'exit 1'],
          ['echo', 'never runs'],
        ],
        image: 'node:alpine',
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, { exitCode: 0 }),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, { exitCode: 1 }),
        jobFinished('Test Job', false),
      ])
    })

    test('signal exit code (SIGTERM)', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'kill -TERM $$']],
        image: 'node:alpine',
      })

      // 1-127 = process failed
      // 128+ = killed by signal (128 + signal number)
      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, {
          exitCode: 143,
        }),
        jobFinished('Test Job', false),
      ])
    })

    test('signal exit code mid-sequence stops job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'kill -TERM $$'],
          ['echo', 'never runs'],
        ],
        image: 'node:alpine',
      })

      // 1-127 = process failed
      // 128+ = killed by signal (128 + signal number)
      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, { exitCode: 0 }),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, { exitCode: 143 }),
        jobFinished('Test Job', false),
      ])
    })
  })

  describe('Command not found', () => {
    test('command not found', async () => {
      const { events, logs: _logs } = await runJob({
        name: 'Test Job',
        commands: [['nonexistent-command-xyz']],
        image: 'node:alpine',
      })

      // 1-127 = process failed
      // 128+ = killed by signal (128 + signal number)
      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, {
          exitCode: 126,
        }),
        jobFinished('Test Job', false),
      ])
    })

    test('mid-sequence stops job', async () => {
      const { events, logs: _logs } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['nonexistent-command-xyz'],
          ['echo', 'never runs'],
        ],
        image: 'node:alpine',
      })

      // 1-127 = process failed
      // 128+ = killed by signal (128 + signal number)
      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, { exitCode: 0 }),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, {
          exitCode: 126,
        }),
        jobFinished('Test Job', false),
      ])
    })
  })

  describe('StreamError', () => {
    test.skip('deferred - hard to simulate', async () => {
      // StreamError requires forcing a pipe failure
      // See discussion: dependency injection or unit test approach
    })
  })

  describe('Job logging', () => {
    test('logs stdout correctly', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['echo', 'world'],
        ],
        image: 'node:alpine',
      })

      expect(logs).toEqual(['hello', 'world'])
    })

    test('logs stderr correctly', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [
          ['sh', '-c', 'echo "error message" >&2'],
          ['echo', 'hello after an error message'],
        ],
        image: 'node:alpine',
      })

      expect(logs).toEqual(['error message', 'hello after an error message'])
    })

    test('logs stdout and stderr merged', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'echo "out"; echo "err" >&2; echo "out2"']],
        image: 'node:alpine',
      })

      // All output should be captured (order may vary due to stream merging)
      expect(logs).toContain('out')
      expect(logs).toContain('err')
      expect(logs).toContain('out2')
      expect(logs).toHaveLength(3)
    })

    test('no output produces empty logs', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['true']],
        image: 'node:alpine',
      })

      expect(logs).toEqual([])
    })

    test('logs captured on failure', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'echo "dying"; exit 1']],
        image: 'node:alpine',
      })

      expect(logs).toContain('dying')
    })

    test('multi-line output from single command', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['printf', 'a\\nb\\nc']],
        image: 'node:alpine',
      })

      expect(logs).toEqual(['a', 'b', 'c'])
    })
  })

  describe('Logging stress', () => {
    test('large output (1000 lines)', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['seq', '1', '10000']],
        image: 'node:alpine',
      })

      expect(logs).toHaveLength(10000)
      expect(logs[0]).toBe('1')
      expect(logs[9999]).toBe('10000')
    })

    test('rapid burst output', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'for i in $(seq 1 100); do echo $i; done']],
        image: 'node:alpine',
      })

      expect(logs).toHaveLength(100)
      expect(logs[0]).toBe('1')
      expect(logs[99]).toBe('100')
    })

    test('interleaved stdout and stderr under load', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [
          [
            'sh',
            '-c',
            'for i in $(seq 1 50); do echo "out$i"; echo "err$i" >&2; done',
          ],
        ],
        image: 'node:alpine',
      })

      // Should capture all 100 lines (50 stdout + 50 stderr)
      expect(logs).toHaveLength(100)

      // Verify both streams are captured
      const outLines = logs.filter(l => l.startsWith('out'))
      const errLines = logs.filter(l => l.startsWith('err'))
      expect(outLines).toHaveLength(50)
      expect(errLines).toHaveLength(50)
    })
  })
})
