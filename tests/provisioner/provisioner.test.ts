import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import { mkdirSync, rmSync, statSync } from 'fs'
import path from 'path'
import { Provisioner } from '../../src/provisioner'

describe('Provisioner', async () => {
  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspace()
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

function setupWorkspace() {
  // This is the path to the workspace directory that the provisioner will use to prepare the environment.
  // In a real scenario, this would be provided by the environment in which the
  // provisioner is running (e.g., a CI/CD pipeline), but for testing purposes, we can define it here.

  // Need to create a unique workspace directory for each test to ensure isolation and avoid conflicts between tests.
  const workspacePath = path.resolve(
    path.join('./tests/provisioner', `./workspace-${crypto.randomUUID()}`),
  )

  mkdirSync(workspacePath, { recursive: true })

  return workspacePath
}

function teardownWorkspace(workspacePath: string) {
  try {
    rmSync(workspacePath, { recursive: true, force: true })
  } catch (err) {
    console.error(`Error cleaning up workspace: ${err}`)
  }
}
