import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { statSync } from 'fs'
import path from 'path'
import { Runner } from '../../src/runner'
import {
  setupWorkspaceIn,
  teardownWorkspaceIn,
} from '../__helpers__/workspace.test-helpers'

describe('Runner', async () => {
  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspaceIn('./tmp/runner/runs')
  })

  afterEach(() => {
    teardownWorkspaceIn(workspacePath)
  })

  describe('Runner', () => {
    it.only('should write the events.log', async () => {
      const runner = new Runner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspace: workspacePath,
      })

      await runner.start()

      expect(statSync(path.join(workspacePath, 'events.log')).isFile()).toBe(
        true,
      )

      const eventLogFile = Bun.file(path.join(workspacePath, 'events.log'))
      const eventLogContent = await eventLogFile.text()
      // console.log('eventLogContent:', eventLogContent)

      expect(eventLogContent).toContain('"type":"started"')
      expect(eventLogContent).toContain('"pipeline":"my-pipeline"')
    })
  })
})
