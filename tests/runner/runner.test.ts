import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { statSync } from 'fs'
import path from 'path'
import { Runner } from '../../src/runner'
import { setupWorkspace, teardownWorkspace } from '../workspace.test-helpers'

describe('Runner', async () => {
  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspace('./tests/runner')
  })

  afterEach(() => {
    teardownWorkspace(workspacePath)
  })

  describe('Provisioning', () => {
    it('should provision the workspace', async () => {
      const runner = new Runner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspace: workspacePath,
      })

      await runner.run()

      expect(
        statSync(path.join(workspacePath, '/repo/.git')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(workspacePath, '/artifacts')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(workspacePath, '/repo/.tuptup.yml')).isFile(),
      ).toBe(true)
    })
  })
})
