import { afterAll, afterEach, beforeEach, describe } from 'bun:test'
import {
  filterRunningContainers,
  removeContainerByName,
} from './executor.test-helpers'
import { setupWorkspaceIn, teardownWorkspaceIn } from './workspace.test-helpers'

export interface WorkspaceContext {
  id: string
  repository: {
    url: string
    branch?: string
  }
  paths: {
    workspace: string
    archive: string
  }
}

export function describeWithWorkspace(
  name: string,
  workingDir: string,
  fn: (ctx: WorkspaceContext) => void,
) {
  describe(name, () => {
    const ctx: WorkspaceContext = {
      id: '',
      repository: {
        url: 'https://github.com/fk1blow/tup-tup-demo-repo',
        branch: 'main',
      },
      paths: {
        workspace: '',
        archive: '',
      },
    }

    beforeEach(() => {
      ctx.id = crypto.randomUUID()
      ctx.paths.workspace = setupWorkspaceIn(workingDir)
      ctx.paths.archive = setupWorkspaceIn(workingDir)
    })

    afterEach(() => {
      teardownWorkspaceIn(ctx.paths.workspace)
      teardownWorkspaceIn(ctx.paths.archive)
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
