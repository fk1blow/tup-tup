import { afterEach, describe, expect, it } from 'bun:test'
import { readdirSync, rmSync, statSync } from 'fs'
import path from 'path'
import { setupProvisioning } from 'src/provisioner'
import type { RuntimeContext } from 'src/runtime-context'

describe('Provisioner', async () => {
  let ctx: RuntimeContext

  const cleanup = () => {
    if (ctx) {
      rmSync(ctx.paths.workspace, { recursive: true, force: true })
      if (ctx.paths.data) {
        rmSync(ctx.paths.data, { recursive: true, force: true })
      }
    }
  }

  afterEach(cleanup)

  describe('Setup', () => {
    it.only('should download and parse the pipeline definition', async () => {
      const res = await setupProvisioning({
        user: 'fk1blow',
        name: 'tup-tup-demo-repo',
        branch: 'main',
      })
      expect(res.pipeline).not.toBeNull()
      expect(res.pipeline?.name).toBe('my-pipeline')
    })

    it('should prepare the workspace directory', async () => {
      ctx = await setupProvisioning({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

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

    it('should prepare the data directory', async () => {
      ctx = await setupProvisioning({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      expect(
        statSync(path.join(ctx.paths.data, '/artifacts')).isDirectory(),
      ).toBe(true)

      expect(statSync(path.join(ctx.paths.data, '/logs')).isDirectory()).toBe(
        true,
      )
    })

    it('should clone the provided repo into the workspace', async () => {
      ctx = await setupProvisioning({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

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
      ctx = await setupProvisioning({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      })

      expect(ctx).not.toBeNull()
      expect(ctx.pipeline?.name).toBe('my-pipeline')
      expect(ctx.pipeline?.jobs).toHaveLength(2)
      expect(ctx.pipeline?.jobs[0]?.name).toBe('test')
      expect(ctx.pipeline?.jobs[1]?.name).toBe('build')
    })
  })

  describe('Error Handling', () => {
    it('should throw an error if the repo cannot be cloned', async () => {
      await expect(
        setupProvisioning({
          repoUrl: 'xoxoxo',
        }),
      ).rejects.toThrow(
        /Provisioner: Failed to clone xoxoxo repository, exit code 128/,
      )
    })

    it('should throw an error if the config file is missing', async () => {
      await expect(
        setupProvisioning({
          repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
          repoBranch: 'test/missing-config',
        }),
      ).rejects.toThrow(/Provisioner: Error accessing config file/)
    })

    it('should throw an error if the config yml file cannot be parsed', async () => {
      await expect(
        setupProvisioning({
          repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
          repoBranch: 'test/invalid-config-file',
        }),
      ).rejects.toThrow(/Provisioner: Error parsing YML config file/)
    })

    it('should throw an error if the config is invalid', async () => {
      await expect(
        setupProvisioning({
          repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
          repoBranch: 'test/invalid-config',
        }),
      ).rejects.toThrow(/Provisioner: Invalid pipeline configuration/)
    })

    it("should throw an error if the job names aren't unique", async () => {
      await expect(
        setupProvisioning({
          repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
          repoBranch: 'test/invalid-config-job-not-unique',
        }),
      ).rejects.toThrow(
        /Provisioner: Invalid pipeline configuration.*Duplicate job name: \\"test\\"/,
      )
    })

    it('should clean up workspace and data on provisioning error', async () => {
      const workspaceRoot = '/tmp/tuptup'
      const dataRoot =
        Bun.env.TUP_TUP_RUNS_PATH ?? path.join(Bun.env.HOME!, '.tuptup')

      const workspaceBefore = new Set(readdirSync(workspaceRoot))
      const dataBefore = new Set(readdirSync(dataRoot))

      await expect(
        setupProvisioning({
          repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
          repoBranch: 'test/invalid-config',
        }),
      ).rejects.toThrow(/Provisioner: Invalid pipeline configuration/)

      const workspaceAfter = new Set(readdirSync(workspaceRoot))
      const dataAfter = new Set(readdirSync(dataRoot))

      expect(workspaceAfter).toEqual(workspaceBefore)
      expect(dataAfter).toEqual(dataBefore)
    })

    // TODO
    it.skip("should throw an error if the job dependencies don't exist", async () => {
      throw new Error('Not implemented yet')
    })
  })
})
