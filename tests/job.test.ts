import { describe, expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
    commandFinished,
    commandStarted,
    exitedResult,
    failedToStartResult,
    findMessage,
    jobFinished,
    jobStarted,
    killedResult,
    spawnJob,
} from '../src/job.test-helpers'

describe('Job', () => {
  describe('Exited', () => {
    test('single command success', async () => {
      const { messages } = await spawnJob({
        name: 'Test Job',
        commands: [['echo', 'hello world']],
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
      // Get the directory of the current module
      const moduleDir = path.dirname(Bun.fileURLToPath(import.meta.url))

      // Create a directory relative to the current module
      const targetDir = path.join(moduleDir, 'test-logs')
      await mkdir(targetDir, { recursive: true })

      // `targetDir` is already the absolute path
      console.log(targetDir)
    })
  })
})
