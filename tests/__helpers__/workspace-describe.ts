import { afterAll, afterEach, beforeEach, describe } from 'bun:test'
import {
  filterRunningContainers,
  removeContainerByName,
} from './executor.test-helpers'
import { setupWorkspaceIn, teardownWorkspaceIn } from './workspace.test-helpers'

export interface WorkspaceContext {
  repoUrl: string
  repoBranch: string
  workspacePath: string
  artifactsPath: string
  logsPath: string
  appPath: string
}

export function describeWithWorkspace(
  name: string,
  workingDir: string,
  fn: (ctx: WorkspaceContext) => void,
) {
  describe(name, () => {
    const ctx: WorkspaceContext = {
      repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      repoBranch: 'main',
      workspacePath: '',
      artifactsPath: '',
      logsPath: '',
      appPath: '',
    }

    beforeEach(() => {
      ctx.workspacePath = setupWorkspaceIn(workingDir)
      ctx.artifactsPath = `${ctx.workspacePath}/artifacts`
      ctx.logsPath = `${ctx.workspacePath}/logs`
      ctx.appPath = `${ctx.workspacePath}/app`
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
