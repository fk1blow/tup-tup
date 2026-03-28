import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { statSync } from 'fs'
import path from 'path'
import { Provisioner } from '../../src/provisioner'
import {
  setupWorkspaceIn,
  teardownWorkspaceIn,
} from '../__helpers__/workspace.test-helpers'

describe('Provisioner', async () => {
  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspaceIn('./tmp/provisioner')
  })

  afterEach(() => {
    teardownWorkspaceIn(workspacePath)
  })

  describe('Provisioner', () => {
    it.only(`should prepare the workspace`, async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspacePath: workspacePath,
      })

      await p.prepare()

      expect(statSync(path.join(workspacePath, '/app')).isDirectory()).toBe(
        true,
      )
      expect(
        statSync(path.join(workspacePath, '/artifacts')).isDirectory(),
      ).toBe(true)

      expect(statSync(path.join(workspacePath, '/logs')).isDirectory()).toBe(
        true,
      )
    })

    it('should clone the provided repo into the workspace', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspacePath: workspacePath,
      })

      await p.prepare()

      expect(
        statSync(path.join(workspacePath, '/app/.git')).isDirectory(),
      ).toBe(true)

      expect(
        statSync(path.join(workspacePath, '/app/.tuptup.yml')).isFile(),
      ).toBe(true)

      expect(statSync(path.join(workspacePath, '/app/index.ts')).isFile()).toBe(
        true,
      )

      expect(
        statSync(path.join(workspacePath, '/app/README.md')).isFile(),
      ).toBe(true)
    })

    it('should parse the pipeline config', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        workspacePath,
      })

      const pipelineContext = await p.prepare()

      expect(pipelineContext).not.toBeNull()
      expect(pipelineContext.pipeline?.name).toBe('my-pipeline')
      expect(pipelineContext.pipeline?.jobs).toHaveLength(2)
      expect(pipelineContext.pipeline?.jobs[0]?.name).toBe('test')
      expect(pipelineContext.pipeline?.jobs[1]?.name).toBe('build')
    })
  })

  describe('Error Handling', () => {
    it('should throw an error if the repo cannot be cloned', async () => {
      const p = new Provisioner({
        repoUrl: 'xoxoxo',
        workspacePath: workspacePath,
      })

      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Failed to clone repository from xoxoxo with exit code 128/,
      )
    })

    it('should throw an error if the config file is missing', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/missing-config',
        workspacePath: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Error accessing config file/,
      )
    })

    it('should throw an error if the config yml file cannot be parsed', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/invalid-config-file',
        workspacePath: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Error parsing YML config file/,
      )
    })

    it('should throw an error if the config is invalid', async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/invalid-config',
        workspacePath: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Invalid pipeline configuration/,
      )
    })

    it("should throw an error if the job names aren't unique", async () => {
      const p = new Provisioner({
        repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
        repoBranch: 'test/invalid-config-job-not-unique',
        workspacePath: workspacePath,
      })

      // Trust me bro
      await expect(p.prepare()).rejects.toThrow(
        /Provisioner: Invalid pipeline configuration.*Duplicate job name: \\"test\\"/,
      )
    })

    // TODO
    it.skip("should throw an error if the job dependencies don't exist", async () => {
      // const p = new Provisioner({
      //   repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      //   branch: 'test/invalid-config-job-not-unique',
      //   workspacePath: workspacePath,
      // })

      // // Trust me bro
      // await expect(p.prepare()).rejects.toThrow(
      //   /Provisioner: Invalid pipeline configuration.*Duplicate job name: \\"test\\"/,
      // )
      throw new Error('Not implemented yet')
    })
  })
})
