import type { JobDefinition } from './job.types'
import { JobDefinitionJson } from './job.types'

export function parseJobDefinition(representation: string): JobDefinition | undefined {
  const parsedJobDefinition = JobDefinitionJson.safeParse(representation)

  if (!parsedJobDefinition.success) {
    console.error('Invalid job arguments:')

    parsedJobDefinition.error.issues.forEach(issue => {
      const path = issue.path.join('.')
      console.error(`  - ${path}: ${issue.message}`)
    })

    return
  }

  return parsedJobDefinition.data
}
