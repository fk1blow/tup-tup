import { defineCommand } from 'citty'
import { ApiClient } from '../api-client'
import { DEFAULT_RUNNER_URL } from '../config'

export default defineCommand({
  meta: {
    name: 'run',
    description: 'Trigger a new pipeline run',
  },
  args: {
    repoUrl: {
      type: 'positional',
      description: 'Git repository URL to run the pipeline for',
      required: true,
    },
    branch: {
      type: 'string',
      alias: 'b',
      description: 'Branch to run (default: default branch)',
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
      const result = await client.triggerRun(args.repoUrl, args.branch)
      console.log(`Run triggered: ${result.runId}`)
      console.log(`Repository: ${result.repoUrl}`)
      if (result.branch) {
        console.log(`Branch: ${result.branch}`)
      }
    } catch (err) {
      console.error(`Failed to trigger run: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  },
})
