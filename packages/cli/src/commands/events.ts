import { defineCommand } from 'citty'
import { ApiClient } from '../api-client'
import { DEFAULT_RUNNER_URL } from '../config'

export default defineCommand({
  meta: {
    name: 'events',
    description: 'Tail the events log for a specific job in a pipeline run',
  },
  args: {
    runId: {
      type: 'positional',
      description: 'Run ID',
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
      for await (const event of client.streamEventLogs(args.runId)) {
        console.log(JSON.stringify(event))
      }
    } catch (err) {
      console.error(
        `Failed to stream logs: ${err instanceof Error ? err.message : err}`,
      )
      process.exit(1)
    }
  },
})
