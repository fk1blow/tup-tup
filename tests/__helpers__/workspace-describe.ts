import { afterAll, afterEach, beforeEach, describe } from 'bun:test'
import {
  filterRunningContainers,
  removeContainerByName,
} from './executor.test-helpers'
import { setupWorkspaceIn, teardownWorkspaceIn } from './workspace.test-helpers'

export interface WorkspaceContext {
  workspacePath: string
}

export function describeWithWorkspace(
  name: string,
  workingDir: string,
  fn: (ctx: WorkspaceContext) => void,
) {
  describe(name, () => {
    const ctx: WorkspaceContext = { workspacePath: '' }

    beforeEach(() => {
      ctx.workspacePath = setupWorkspaceIn(workingDir)
    })

    afterEach(() => {
      teardownWorkspaceIn(ctx.workspacePath)
    })

    afterAll(async () => {
      const runningContainers = await filterRunningContainers('tuptup')
      for (const container of runningContainers) {
        await removeContainerByName(container)
      }
    })

    fn(ctx)
  })
}
