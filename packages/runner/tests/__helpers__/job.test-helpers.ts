import { DockerExecutor } from '../../src/docker-executor'
import { Job } from '../../src/job'
import { JobDefinition } from '../../src/job.types'
import { TestListLogger } from './test-list-logger'

/**
 * Creates a job setup without running it, allowing manual control over the lifecycle.
 * Call teardown() when done to clean up executor and logger.
 */
export const setupJob = async (
  definition: JobDefinition,
  workspacePath: string,
): Promise<{
  job: Job
  logger: TestListLogger
  teardown: () => Promise<void>
}> => {
  const logger = new TestListLogger()

  const executor = new DockerExecutor({
    name: definition.name,
    image: definition.image,
    workspacePath,
  })

  await executor.start()

  const job = new Job({
    definition,
    executor,
    logger,
  })

  const teardown = async () => {
    await executor.stop()
    await logger.stop()
  }

  return { job, logger, teardown }
}

/**
 * Runs a job with direct instantiation and returns collected events and logs.
 */
export const setupJobSelfTeardown = async (
  definition: JobDefinition,
  workspacePath: string,
): Promise<{
  logs: string[]
  jobResult: [boolean, JobDefinition]
  job: Job
}> => {
  const { job, logger, teardown } = await setupJob(definition, workspacePath)

  let jobResult: [boolean, JobDefinition]

  try {
    jobResult = await job.run()
  } finally {
    await teardown()
  }

  return { logs: logger.logs, jobResult, job }
}
