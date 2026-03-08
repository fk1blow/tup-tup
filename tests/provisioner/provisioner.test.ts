import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { statSync } from 'fs'
import path from 'path'
import { Provisioner } from '../../src/provisioner'
import { setupWorkspace, teardownWorkspace } from '../workspace.test-helpers'

describe('Provisioner', async () => {
  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspace('./tests/provisioner')
  })

  afterEach(() => {
    teardownWorkspace(workspacePath)
  })

  describe('Happy Path', () => {
    it(`should prepare the /repo and /artifacts directories`, async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspace: workspacePath,
      })

      await p.prepare()

      expect(statSync(path.join(workspacePath, '/repo')).isDirectory()).toBe(
        true,
      )
      expect(
        statSync(path.join(workspacePath, '/artifacts')).isDirectory(),
      ).toBe(true)
    })

    it('should clone the provided repot into the workspace', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspace: workspacePath,
      })

      await p.prepare()

      expect(
        statSync(path.join(workspacePath, '/repo/.git')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(workspacePath, '/repo/.tuptup.yml')).isFile(),
      ).toBe(true)

      expect(
        statSync(path.join(workspacePath, '/repo/index.ts')).isFile(),
      ).toBe(true)

      expect(
        statSync(path.join(workspacePath, '/repo/README.md')).isFile(),
      ).toBe(true)
    })

    it('should parse the pipeline config', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspace: workspacePath,
      })

      await p.prepare()

      expect(p.pipelineConfig).not.toBeNull()
      expect(p.pipelineConfig?.name).toBe('my-pipeline')
      expect(p.pipelineConfig?.jobs).toHaveLength(2)
      expect(p.pipelineConfig?.jobs[0]?.name).toBe('test')
      expect(p.pipelineConfig?.jobs[1]?.name).toBe('build')
    })
  })

  describe('Error Handling', () => {
    it('should throw an error if the repo cannot be cloned', async () => {
      const p = new Provisioner({
        repoUrl: 'xoxoxo',
        workspace: workspacePath,
      })

      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Failed to clone repository from xoxoxo with exit code 128/,
      )
    })

    it('should throw an error if the config file is missing', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        branch: 'test/missing-config',
        workspace: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Error accessing config file/,
      )
    })

    it('should throw an error if the config yml file cannot be parsed', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        branch: 'test/invalid-config-file',
        workspace: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Error parsing YML config file/,
      )
    })

    it('should throw an error if the config is invalid', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        branch: 'test/invalid-config',
        workspace: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Invalid pipeline configuration/,
      )
    })
  })
})
