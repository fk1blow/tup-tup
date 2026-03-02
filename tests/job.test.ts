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
  })

  describe('Command now found', () => {
    test('command not found', async () => {
      const { events, logs: _logs } = await runJob({
        name: 'Test Job',
        commands: [['nonexistent-command-xyz']],
        image: 'node:alpine',
      })

      // 1-127 = process faild
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

      // 1-127 = process faild
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

  describe('Killed', () => {
    test('command killed', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'kill -TERM $$']],
        image: 'node:alpine',
      })

      // 1-127 = process faild
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

    test('mid-sequence stops job', async () => {
      const { events } = await runJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'kill -TERM $$'],
          ['echo', 'never runs'],
        ],
        image: 'node:alpine',
      })

      // 1-127 = process faild
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
  })
})
