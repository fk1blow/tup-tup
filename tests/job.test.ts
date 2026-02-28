import { describe, expect, test } from 'bun:test'
import {
  commandFinished,
  commandStarted,
  exitedResult,
  failedToStartResult,
  findMessage,
  jobFinished,
  jobStarted,
  killedResult,
  runJob,
} from './job.test-helpers'

describe('Job', () => {
  describe('Exited', () => {
    test('single command success', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['echo', 'hello world']],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(0)),
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
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(0)),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, exitedResult(0)),
        commandStarted('Test Job', 2),
        commandFinished('Test Job', 2, exitedResult(0)),
        jobFinished('Test Job', true),
      ])
    })

    test('non-zero exit code fails job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'exit 1']],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(1)),
        jobFinished('Test Job', false),
      ])
    })

    test('preserves custom exit code', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'exit 42']],
      })

      const finishedMsg = findMessage(events, 'command:finished')
      expect(finishedMsg?.result).toEqual({ type: 'Exited', exitCode: 42 })
    })

    test('mid-sequence failure stops job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'exit 1'],
          ['echo', 'never runs'],
        ],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(0)),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, exitedResult(1)),
        jobFinished('Test Job', false),
      ])
    })
  })

  describe('FailedToStart', () => {
    test('command not found', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['nonexistent-command-xyz']],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished(
          'Test Job',
          0,
          failedToStartResult({
            code: 'ENOENT',
            message: 'Executable not found in $PATH: "nonexistent-command-xyz"',
          }),
        ),
        jobFinished('Test Job', false),
      ])
    })

    test('mid-sequence stops job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['nonexistent-command-xyz'],
          ['echo', 'never runs'],
        ],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(0)),
        commandStarted('Test Job', 1),
        commandFinished(
          'Test Job',
          1,
          failedToStartResult({
            code: 'ENOENT',
            message: 'Executable not found in $PATH: "nonexistent-command-xyz"',
          }),
        ),
        jobFinished('Test Job', false),
      ])
    })
  })

  describe('Killed', () => {
    test('command killed', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'kill -TERM $$']],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, killedResult('SIGTERM')),
        jobFinished('Test Job', false),
      ])
    })

    test('mid-sequence stops job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'kill -TERM $$'],
          ['echo', 'never runs'],
        ],
      })

      expect(events).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(0)),
        commandStarted('Test Job', 1),
        commandFinished('Test Job', 1, killedResult('SIGTERM')),
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
      })

      expect(logs).toEqual(['error message', 'hello after an error message'])
    })

    test('logs stdout and stderr merged', async () => {
      const { logs } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'echo "out"; echo "err" >&2; echo "out2"']],
      })

      // All output should be captured (order may vary due to stream merging)
      expect(logs).toContain('out')
      expect(logs).toContain('err')
      expect(logs).toContain('out2')
      expect(logs).toHaveLength(3)
    })
  })
})
