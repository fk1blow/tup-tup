import { defineCommand } from 'citty'
import { ApiClient } from '../api-client'
import { DEFAULT_RUNNER_URL } from '../config'

export default defineCommand({
  meta: {
    name: 'logs',
    description: 'Get logs for a specific job in a pipeline run',
  },
  args: {
    runId: {
      type: 'positional',
      description: 'Run ID',
      required: true,
    },
    job: {
      type: 'positional',
      description: 'Job name',
      required: true,
    },
    url: {
      type: 'string',
      description: 'Runner URL',
      default: DEFAULT_RUNNER_URL,
    },
  },
  async run({ args }) {
    const client = new ApiClient(args.url)

    try {
      const logs = await client.getJobLogs(args.runId, args.job)
      console.log(logs)
    } catch (err) {
      console.error(`Failed to get logs: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  },
})
