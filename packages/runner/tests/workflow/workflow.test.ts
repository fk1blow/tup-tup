import { afterEach, describe, expect, it } from 'bun:test'
import { rmSync, statSync } from 'fs'
import path from 'path'
import type { RuntimeContext } from 'src/runtime-context'
import { Workflow } from '../../src/workflow'

describe('Runner', async () => {
  let ctx: RuntimeContext

  const cleanup = () => {
    if (ctx) {
      rmSync(ctx.paths.workspace, { recursive: true, force: true })
      if (ctx.paths.data) {
        rmSync(ctx.paths.data, { recursive: true, force: true })
      }
    }
  }

  // afterEach(cleanup)

  // WIP
  describe('Workflow', () => {
    it.only('should write the events.log', async () => {
      const runner = new Workflow({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      const startResult = await runner.start()

      ctx = startResult.context

      console.log('startResult.context:', startResult.context)

      const workspacePath = startResult.context.paths.workspace
      const dataPath = startResult.context.paths.data

      expect(statSync(ctx.paths.workspace).isDirectory()).toBe(true)

      // expect(statSync(path.join(workspacePath, 'events.log')).isFile()).toBe(
      //   true,
      // )

      // const eventLogFile = Bun.file(path.join(workspacePath, 'events.log'))
      // const eventLogContent = await eventLogFile.text()
      // console.log('eventLogContent:', eventLogContent)

      // expect(eventLogContent).toContain('"type":"run:started"')
      // expect(eventLogContent).toContain('"pipeline":"my-pipeline"')

      await startResult.completion
    })
  })
})
