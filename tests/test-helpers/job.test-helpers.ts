import mergeStreams from '@sindresorhus/merge-streams'
import { Readable } from 'node:stream'
import { DockerExecutor } from '../../src/docker-executor'
import { Job } from '../../src/job'
import {
  JobDefinition,
  type JobCommandResult,
  type JobEventMap,
} from '../../src/job.types'

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
  workspacePath: string,
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

  const reporter = {
    onJobStarted(payload: JobEventMap['job:started'][0]) {
      events.push({ type: 'job:started', ...payload })
    },
    onCommandStarted(payload: JobEventMap['command:started'][0]) {
      events.push({ type: 'command:started', ...payload })
    },
    onCommandFinished(payload: JobEventMap['command:finished'][0]) {
      events.push({ type: 'command:finished', ...payload })
    },
    async onJobFinished(payload: JobEventMap['job:finished'][0]) {
      events.push({ type: 'job:finished', ...payload })
      await logStream.close()
    },
  }

  const logger = {
    async write(line: string) {
      logs.push(line)
    },
    async pipe(...streams: ReadableStream[]) {
      const readableStreams = streams.map(stream => Readable.fromWeb(stream))
      const mergedStream: ReadableStream<Uint8Array> = Readable.toWeb(
        mergeStreams(readableStreams),
      )
      await mergedStream.pipeTo(logStream, {
        preventClose: true,
      })
    },
    async stop() {
      await logStream.getWriter().close()
    },
  }

  // Don't like this being hardcoded, but b/c i cannot fully stub
  // docker-executor behind a test-executor(mainly due to error being swallowed
  // the docker runtime itself)
  const executor = new DockerExecutor({
    name: definition.name,
    image: definition.image,
    workspacePath,
  })

  await executor.start()
  try {
    const job = new Job({
      definition,
      reporter,
      executor,
      logger,
    })
    await job.run()
  } finally {
    await executor.stop()
  }

  return { events, logs }
}
