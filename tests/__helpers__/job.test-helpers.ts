import { DockerExecutor } from '../../src/docker-executor'
import { Job } from '../../src/job'
import {
  JobDefinition,
  type JobCommandResult,
  type JobEventMap,
} from '../../src/job.types'
import { TestEventsReporter } from './test-events-reporter'
import { TestListLogger } from './test-list-logger'

// Discriminated union with `type` field for pattern matching
export type TypedJobEvent = {
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
  const logger = new TestListLogger()

  const reporter = new TestEventsReporter(logger)

  // Don't like this being hardcoded, but b/c i cannot fully stub
  // docker-executor behind a test-executor(mainly due to error being swallowed
  // the docker runtime itself)
  const executor = new DockerExecutor({
    pipelineName: definition.name,
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

  return { events: reporter.events, logs: logger.logs }
}
