import { defineCommand } from 'citty'
import { ApiClient } from '../api-client'
import { DEFAULT_RUNNER_URL } from '../config'

export default defineCommand({
  meta: {
    name: 'list',
    description: 'List all pipeline runs',
  },
  args: {
    url: {
      type: 'string',
      description: 'Runner URL',
      default: DEFAULT_RUNNER_URL,
    },
  },
  async run({ args }) {
    const client = new ApiClient(args.url)

    try {
      const result = await client.listRuns()

      if (result.runs.length === 0) {
        console.log('No runs found')
        return
      }

      console.log('Runs:')
      for (const run of result.runs) {
        console.log(`  ${run.runId} - ${run.status}`)
        if (run.repoUrl) {
          console.log(`    Repository: ${run.repoUrl}`)
        }
        if (run.branch) {
          console.log(`    Branch: ${run.branch}`)
        }
      }
    } catch (err) {
      console.error(`Failed to list runs: ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  },
})
