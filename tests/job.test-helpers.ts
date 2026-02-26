import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type {
  JobCommandResult,
  JobDefinition,
  JobMessage,
} from '../src/job.types'

// Command Result Helpers

export const exitedResult = (exitCode = 0): JobCommandResult => ({
  type: 'Exited',
  exitCode,
})

export const killedResult = (signal: NodeJS.Signals): JobCommandResult => ({
  type: 'Killed',
  signal,
})

export const failedToStartResult = (opts: {
  code: string
  message: string
}): JobCommandResult => ({ type: 'FailedToStart', ...opts })

// Job Message Helpers

export const jobStarted = (jobName: string): JobMessage => ({
  type: 'job:started',
  jobName,
})

export const jobFinished = (jobName: string, success: boolean): JobMessage => ({
  type: 'job:finished',
  jobName,
  success,
})

export const commandStarted = (
  jobName: string,
  commandIndex: number,
): JobMessage => ({
  type: 'command:started',
  jobName,
  commandIndex,
})

export const commandFinished = (
  jobName: string,
  commandIndex: number,
  result: JobCommandResult,
): JobMessage => ({
  type: 'command:finished',
  jobName,
  commandIndex,
  result,
})

// Test Utilities

export const findMessage = <T extends JobMessage['type']>(
  messages: unknown[],
  type: T,
): Extract<JobMessage, { type: T }> | undefined => {
  return messages.find(
    (m): m is Extract<JobMessage, { type: T }> =>
      typeof m === 'object' && m !== null && (m as JobMessage).type === type,
  ) as Extract<JobMessage, { type: T }> | undefined
}

export const spawnJob = async (
  job: JobDefinition,
): Promise<{
  process: Bun.Subprocess<'ignore', 'inherit', 'inherit'>
  messages: unknown[]
}> => {
  const messages: unknown[] = []

  const process = Bun.spawn(
    ['bun', 'run', './src/job.ts', JSON.stringify(job)],
    {
      stdout: 'inherit',
      stderr: 'inherit',
      ipc: message => {
        messages.push(message)
      },
    },
  )

  await process.exited

  return { process, messages }
}

export const getLogsDir = async (): Promise<{
  targetDir: string
  timestamp: string
}> => {
  const timestamp = Date.now().toString()

  const moduleDir = path.dirname(Bun.fileURLToPath(import.meta.url))

  const targetDir = path.join(moduleDir, 'test-logs', String(timestamp))
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true })
  }

  return { targetDir, timestamp }
}
