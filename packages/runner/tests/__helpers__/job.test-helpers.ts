import { DockerExecutor } from '../../src/docker-executor'
import { Job } from '../../src/job'
import { JobDefinition } from '../../src/job.types'
import { TestListLogger } from './test-list-logger'

/**
 * Runs a job with direct instantiation and returns collected events and logs.
 */
export const runJob = async (
  definition: JobDefinition,
  workspacePath: string,
): Promise<{
  logs: string[]
  jobResult: [boolean, JobDefinition]
}> => {
  const logger = new TestListLogger()

  // Don't like this being hardcoded, but b/c i cannot fully stub
  // docker-executor behind a test-executor(mainly due to error being swallowed
  // the docker runtime itself)
  const executor = new DockerExecutor({
    pipelineName: definition.name,
    image: definition.image,
    workspacePath,
  })

  let jobResult: [boolean, JobDefinition] | null

  await executor.start()
  try {
    const job = new Job({
      definition,
      executor,
      logger,
    })
    jobResult = await job.run()
  } finally {
    await executor.stop()
    await logger.stop()
  }

  return { logs: logger.logs, jobResult }
}
