import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { statSync } from 'fs'
import path from 'path'
import { Runner } from '../../src/runner'
import {
  setupWorkspaceIn,
  teardownWorkspaceIn,
} from '../workspace.test-helpers'

describe('Runner', async () => {
  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspaceIn('./tests/runner')
  })

  afterEach(() => {
    // teardownWorkspaceIn(workspacePath)
  })

  describe('Provisioning', () => {
    it('should provision the workspace', async () => {
      const runner = new Runner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspace: workspacePath,
      })

      await runner.run()

      expect(statSync(path.join(workspacePath, 'logs/test.log')).isFile()).toBe(
        true,
      )

      expect(
        statSync(path.join(workspacePath, 'logs/build.log')).isFile(),
      ).toBe(true)

      // expect(
      //   statSync(path.join(workspacePath, '/artifacts')).isDirectory(),
      // ).toBe(true)

      // expect(
      //   statSync(path.join(workspacePath, '/repo/.tuptup.yml')).isFile(),
      // ).toBe(true)
    })
  })
})
