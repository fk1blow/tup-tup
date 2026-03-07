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
  // This is the path to the workspace directory that the provisioner will use to prepare the environment.
  // In a real scenario, this would be provided by the environment in which the
  // provisioner is running (e.g., a CI/CD pipeline), but for testing purposes, we can define it here.
  let workspacePath: string

  beforeAll(() => {
    workspacePath = path.resolve(
      path.join('./tests/provisioner', './workspace'),
    )
  })

  beforeEach(() => {
    mkdirSync(workspacePath, { recursive: true })
  })

  // Prepare the workspace dir in which the provisioner will prepare the environment
  afterEach(() => {
    try {
      rmSync(workspacePath, { recursive: true, force: true })
    } catch (err) {
      console.error(`Error cleaning up workspace: ${err}`)
    }
  })

  it.skip('should clone the repo', async () => {
    const p = new Provisioner({
      repoUrl: 'https://github.com/fk1blow/tup-tup-demo-repo',
      workspace: workspacePath,
    })

    await p.prepare()

    expect(statSync(path.join(workspacePath, '/repo')).isDirectory()).toBe(true)
    expect(statSync(path.join(workspacePath, '/repo/.git')).isDirectory()).toBe(
      true,
    )
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
