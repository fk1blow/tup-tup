import { afterEach, describe, expect, it } from 'bun:test'
import { rmSync, statSync } from 'fs'
import path from 'path'
import { Runner } from '../../src/runner'

describe('Runner', async () => {
  let runner: Runner | null = null

  const cleanup = () => {
    if (runner) {
      const ctx = runner.provisioner.context
      rmSync(`/tmp/tuptup/${ctx.id}`, { recursive: true, force: true })
      if (ctx.paths.archive) {
        rmSync(ctx.paths.archive, { recursive: true, force: true })
      }
      runner = null
    }
  }

  afterEach(cleanup)

  // WIP
  describe('Runner', () => {
    it.only('should write the events.log', async () => {
      runner = new Runner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      await runner.start()

      const archivePath = runner.provisioner.context.paths.archive!

      expect(statSync(path.join(archivePath, 'events.log')).isFile()).toBe(true)

      const eventLogFile = Bun.file(path.join(archivePath, 'events.log'))
      const eventLogContent = await eventLogFile.text()

      expect(eventLogContent).toContain('"type":"run:started"')
      expect(eventLogContent).toContain('"pipeline":"my-pipeline"')
    })
  })
})
