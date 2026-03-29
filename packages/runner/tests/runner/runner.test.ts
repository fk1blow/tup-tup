import { afterEach, describe, expect, it } from 'bun:test'
import { rmSync, statSync } from 'fs'
import path from 'path'
import type { RuntimeContext } from 'src/runtime-context'
import { Runner } from '../../src/runner'

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
  describe('Runner', () => {
    it.only('should write the events.log', async () => {
      const runner = new Runner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      const startResult = await runner.start()
      ctx = startResult.context
      console.log('startResult.context:', startResult.context)

      const archivePath = startResult.context.paths.data!

      expect(statSync(path.join(archivePath, 'events.log')).isFile()).toBe(true)

      const eventLogFile = Bun.file(path.join(archivePath, 'events.log'))
      const eventLogContent = await eventLogFile.text()
      console.log('eventLogContent:', eventLogContent)

      expect(eventLogContent).toContain('"type":"run:started"')
      expect(eventLogContent).toContain('"pipeline":"my-pipeline"')
    })
  })
})
