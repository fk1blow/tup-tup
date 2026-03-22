import { defineCommand } from 'citty'
import { ApiClient } from '../api-client'
import { DEFAULT_RUNNER_URL } from '../config'

export default defineCommand({
  meta: {
    name: 'status',
    description: 'Get the status of a pipeline run',
  },
  args: {
    runId: {
      type: 'positional',
      description: 'Run ID to get status for',
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
      const result = await client.getRunStatus(args.runId)
      console.log(`Run: ${result.runId}`)
      console.log(`Status: ${result.status}`)
      if (result.repoUrl) {
        console.log(`Repository: ${result.repoUrl}`)
      }
      if (result.branch) {
        console.log(`Branch: ${result.branch}`)
      }
    } catch (err) {
      console.error(`Failed to get status: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  },
})
