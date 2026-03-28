import { afterEach, describe, expect, it } from 'bun:test'
import { rmSync, statSync } from 'fs'
import path from 'path'
import { Provisioner } from '../../src/provisioner'

describe('Provisioner', async () => {
  let provisioner: Provisioner | null = null

  const cleanup = () => {
    if (provisioner) {
      const id = provisioner.id
      rmSync(`/tmp/tuptup/${id}`, { recursive: true, force: true })
      rmSync(`${Bun.env.TUP_TUP_RUNS_PATH}/${id}`, { recursive: true, force: true })
      provisioner = null
    }
  }

  afterEach(cleanup)

  describe('Setup', () => {
    it('should prepare the workspace', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      const ctx = await provisioner.setup()

      expect(
        statSync(path.join(ctx.paths.workspace, '/app')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(ctx.paths.workspace, '/artifacts')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(ctx.paths.workspace, '/logs')).isDirectory(),
      ).toBe(true)
    })

    it('should prepare the archive', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      const ctx = await provisioner.setup()

      expect(
        statSync(path.join(ctx.paths.archive, '/artifacts')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(ctx.paths.archive, '/logs')).isDirectory(),
      ).toBe(true)
    })

    it('should clone the provided repo into the workspace', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      const ctx = await provisioner.setup()

      expect(
        statSync(path.join(ctx.paths.workspace, '/app/.git')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(ctx.paths.workspace, '/app/.tuptup.yml')).isFile(),
      ).toBe(true)

      expect(
        statSync(path.join(ctx.paths.workspace, '/app/index.ts')).isFile(),
      ).toBe(true)

      expect(
        statSync(path.join(ctx.paths.workspace, '/app/README.md')).isFile(),
      ).toBe(true)
    })

    it('should parse the pipeline config', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      const ctx = await provisioner.setup()

      expect(ctx).not.toBeNull()
      expect(ctx.pipeline?.name).toBe('my-pipeline')
      expect(ctx.pipeline?.jobs).toHaveLength(2)
      expect(ctx.pipeline?.jobs[0]?.name).toBe('test')
      expect(ctx.pipeline?.jobs[1]?.name).toBe('build')
    })
  })

  describe('Error Handling', () => {
    it('should throw an error if the repo cannot be cloned', async () => {
      provisioner = new Provisioner({
        repoUrl: 'xoxoxo',
      })

      await expect(provisioner.setup()).rejects.toThrow(
        /Provisioner: Failed to clone repository from xoxoxo with exit code 128/,
      )
    })

    it('should throw an error if the config file is missing', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/missing-config',
      })

      await expect(provisioner.setup()).rejects.toThrow(
        /Provisioner: Error accessing config file/,
      )
    })

    it('should throw an error if the config yml file cannot be parsed', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/invalid-config-file',
      })

      await expect(provisioner.setup()).rejects.toThrow(
        /Provisioner: Error parsing YML config file/,
      )
    })

    it('should throw an error if the config is invalid', async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/invalid-config',
      })

      await expect(provisioner.setup()).rejects.toThrow(
        /Provisioner: Invalid pipeline configuration/,
      )
    })

    it("should throw an error if the job names aren't unique", async () => {
      provisioner = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/invalid-config-job-not-unique',
      })

      await expect(provisioner.setup()).rejects.toThrow(
        /Provisioner: Invalid pipeline configuration.*Duplicate job name: \\"test\\"/,
      )
    })

    // TODO
    it.skip("should throw an error if the job dependencies don't exist", async () => {
      throw new Error('Not implemented yet')
    })
  })
})
