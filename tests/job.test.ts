import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import {
  commandFinished,
  commandStarted,
  exitedResult,
  failedToStartResult,
  findMessage,
  getLogsDir,
  jobFinished,
  jobStarted,
  killedResult,
  spawnJob,
} from './job.test-helpers'

describe('Job', () => {
  let logsDir: string

  beforeAll(async () => {
    const result = await getLogsDir()
    logsDir = result.targetDir
  })

  afterAll(() => {
    // rmSync(logsDir, { recursive: true })
  })

  describe('Exited', () => {
    test('single command success', async () => {
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [['echo', 'hello world']],
        logsDir,
      })

      expect(messages).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(0)),
        jobFinished('Test Job', true),
      ])
    })

    test('multiple commands success', async () => {
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello world'],
          ['sleep', '0.1'],
          ['echo', 'goodbye'],
        ],
        logsDir,
      })

      expect(messages).toEqual([
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
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'exit 1']],
        logsDir,
      })

      expect(messages).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, exitedResult(1)),
        jobFinished('Test Job', false),
      ])
    })

    test('preserves custom exit code', async () => {
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'exit 42']],
        logsDir,
      })

      const finishedMsg = findMessage(messages, 'command:finished')
      expect(finishedMsg?.result).toEqual({ type: 'Exited', exitCode: 42 })
    })

    test('mid-sequence failure stops job', async () => {
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'exit 1'],
          ['echo', 'never runs'],
        ],
        logsDir,
      })

      expect(messages).toEqual([
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
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [['nonexistent-command-xyz']],
        logsDir,
      })

      expect(messages).toEqual([
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
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['nonexistent-command-xyz'],
          ['echo', 'never runs'],
        ],
        logsDir,
      })

      expect(messages).toEqual([
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
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [['sh', '-c', 'kill -TERM $$']],
        logsDir,
      })

      expect(messages).toEqual([
        jobStarted('Test Job'),
        commandStarted('Test Job', 0),
        commandFinished('Test Job', 0, killedResult('SIGTERM')),
        jobFinished('Test Job', false),
      ])
    })

    test('mid-sequence stops job', async () => {
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [
          ['echo', 'hello'],
          ['sh', '-c', 'kill -TERM $$'],
          ['echo', 'never runs'],
        ],
        logsDir,
      })

      expect(messages).toEqual([
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

  describe.only('Job logging', async () => {
    test('logs stdout and stderr correctly', async () => {
      console.log('targetDir, timestamp:', logsDir)
      // console.log('logsDir:', logsDir)

      // const foo = Bun.file(path.join(logsDir, "foo.txt"))
      // foo.write('This is stdout\n')

      const { messages } = await spawnJob({
        name: 'Test Job writing logs',
        commands: [['echo', 'hello']],
        logsDir: logsDir,
      })
    })
  })
})
