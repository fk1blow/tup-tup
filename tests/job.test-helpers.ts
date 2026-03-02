import { EventEmitter } from 'node:events'
import { DockerRuntime } from '../src/docker-runtime'
import { Job } from '../src/job'
import {
  JobDefinition,
  type JobCommandResult,
  type JobEventMap,
} from '../src/job.types'

// Discriminated union with `type` field for pattern matching
type TypedJobEvent = {
  [K in keyof JobEventMap]: { type: K } & JobEventMap[K][0]
}[keyof JobEventMap]

// Job Message Helpers

export const jobStarted = (
  jobName: string,
): Extract<TypedJobEvent, { type: 'job:started' }> => ({
  type: 'job:started',
  jobName,
})

export const jobFinished = (
  jobName: string,
  success: boolean,
): Extract<TypedJobEvent, { type: 'job:finished' }> => ({
  type: 'job:finished',
  jobName,
  success,
})

export const commandStarted = (
  jobName: string,
  commandIndex: number,
): Extract<TypedJobEvent, { type: 'command:started' }> => ({
  type: 'command:started',
  jobName,
  commandIndex,
})

export const commandFinished = (
  jobName: string,
  commandIndex: number,
  result: JobCommandResult,
): Extract<TypedJobEvent, { type: 'command:finished' }> => ({
  type: 'command:finished',
  jobName,
  commandIndex,
  result,
})

// Test Utilities

export const findMessage = <T extends keyof JobEventMap>(
  messages: TypedJobEvent[],
  type: T,
): Extract<TypedJobEvent, { type: T }> | undefined => {
  return messages.find(
    (m): m is Extract<TypedJobEvent, { type: T }> => m.type === type,
  )
}

/**
 * Runs a job with direct instantiation and returns collected events and logs.
 */
export const runJob = async (
  definition: JobDefinition,
): Promise<{
  events: TypedJobEvent[]
  logs: string[]
}> => {
  const events: TypedJobEvent[] = []
  const logs: string[] = []

  // Create a WritableStream that collects log lines
  const decoder = new TextDecoder()
  const logStream = new WritableStream<Uint8Array>({
    write(chunk) {
      const text = decoder.decode(chunk, { stream: true })
      // Split by newlines and add non-empty lines
      for (const line of text.split('\n')) {
        if (line) {
          logs.push(line)
        }
      }
    },
  })

  const emitter = new EventEmitter<JobEventMap>()

  // Collect events as JobMessage objects
  emitter.on('job:started', payload => {
    events.push({ type: 'job:started', ...payload })
  })
  emitter.on('command:started', payload => {
    events.push({ type: 'command:started', ...payload })
  })
  emitter.on('command:finished', payload => {
    events.push({ type: 'command:finished', ...payload })
  })
  emitter.on('job:finished', async payload => {
    events.push({ type: 'job:finished', ...payload })
    await logStream.close()
  })

  const runner = new DockerRuntime({
    name: 'Test Job',
    image: 'node:alpine',
  })

  await runner.start()
  try {
    const job = new Job(definition, emitter, logStream, runner)
    await job.run()
  } finally {
    await runner.stop()
  }

  return { events, logs }
}
