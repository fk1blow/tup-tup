import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import { DockerExecutor } from '../../src/docker-executor'
import {
  filterRunningContainers,
  removeContainerByName,
} from '../__helpers__/executor.test-helpers'
import {
  setupWorkspaceIn,
  teardownWorkspaceIn,
} from '../__helpers__/workspace.test-helpers'

const containerNamePattern = /^tuptup-[\w-]+-\d+$/
const containerIdPattern = /^[0-9a-f]{12,64}$/

describe('Docker Executor', async () => {
  afterAll(async () => {
    const runningContainers = await filterRunningContainers('tuptup')
    for (const container of runningContainers) {
      await removeContainerByName(container)
    }
  })

  let workspacePath: string

  beforeEach(() => {
    workspacePath = setupWorkspaceIn('./tests/runner')
  })

  afterEach(() => {
    teardownWorkspaceIn(workspacePath)
  })

  describe('Lifecycle', async () => {
    it('should create an instance', () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      expect(runtime.containerName).toMatch(containerNamePattern)
    })

    it('should start container then stop it', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Start Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()
      expect(runtime.containerName).toMatch(containerNamePattern)
      expect(runtime.containerId).toMatch(containerIdPattern)

      let runningContainers = await filterRunningContainers(
        runtime.containerName,
        { exact: true },
      )
      expect(runningContainers.length).toBe(1)

      await runtime.stop()
      expect(runtime.containerId).toBeNull()

      runningContainers = await filterRunningContainers(runtime.containerName, {
        exact: true,
      })
      expect(runningContainers.length).toBe(0)
    })

    it('should be able to stop a container already removed externally', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Stop Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()

      await removeContainerByName(runtime.containerName)
      expect(runtime.stop()).resolves.toBeUndefined()
      expect(runtime.containerId).toBeNull()
    })

    it('should throw an error when starting a container with an invalid image', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Invalid Image Test Job',
        image: 'nonexistent:image',
        workspacePath,
      })

      // This is fine
      await expect(runtime.start()).rejects.toThrow(
        /Unable to find image 'nonexistent:image'/,
      )
    })

    it('should error when starting a container with the same name as an existing one', async () => {
      const spy = spyOn(Date, 'now').mockReturnValue(6666666666666)

      const runtime1 = new DockerExecutor({
        pipelineName: 'Duplicate Name Test Job',
        image: 'node:alpine',
        workspacePath,
      })
      await runtime1.start()

      const runtime2 = new DockerExecutor({
        pipelineName: 'Duplicate Name Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      spy.mockRestore()

      let runningContainers = await filterRunningContainers(
        runtime1.containerName,
        { exact: true },
      )
      expect(runningContainers.length).toBe(1)

      // This is fine
      await expect(runtime2.start()).rejects.toThrow(
        /Conflict. The container name "\/tuptup-duplicate-name-test-job-\d+" is already in use/,
      )

      await runtime1.stop()

      runningContainers = await filterRunningContainers(
        runtime1.containerName,
        { exact: true },
      )
      expect(runningContainers.length).toBe(0)
    })

    it('should error when calling exec before starting the container', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Stop Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      // This is fine
      await expect(runtime.exec(['echo', 'hello from inside'])).rejects.toThrow(
        'Container is not running',
      )
    })

    it('should error when starting a container 2 times on the same instance', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Stop Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()
      await expect(runtime.start()).rejects.toThrow(
        /Conflict. The container name "\/tuptup-stop-test-job-\d+" is already in use/,
      )
    })
  })

  describe('Commands', async () => {
    it('should execute a command inside the container', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Exec Command Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()

      const { stdout, stderr } = await runtime.exec([
        'echo',
        'hello from inside',
      ])
      const stdoutText = await new Response(stdout).text()
      const stderrText = await new Response(stderr).text()

      expect(stdoutText.trim()).toBe('hello from inside')
      expect(stderrText.trim()).toBe('')

      await runtime.stop()
    })

    it('should execute multiple commands inside the container', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Exec Multiple Commands Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()

      const commands = [
        ['echo', 'first command'],
        ['echo', 'second command'],
        ['echo', 'third command'],
      ]

      for (const cmd of commands) {
        const { stdout, stderr } = await runtime.exec(cmd)
        const stdoutText = await new Response(stdout).text()
        const stderrText = await new Response(stderr).text()

        expect(stdoutText.trim()).toMatch(new RegExp(`^${cmd[1]}$`))
      }

      await runtime.stop()
    })

    it('should fail with non-zero exit code when executing an unknown command', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Exec Unknown Command Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()

      const { stdout, exited } = await runtime.exec(['nonexistent-command-xyz'])
      const stdoutText = await new Response(stdout).text()
      const exitCode = await exited

      expect(exitCode).not.toBe(0)
      expect(stdoutText.trim()).toMatch(/OCI runtime exec failed: exec failed/)

      await runtime.stop()
    })

    it('should fail with non-zero exit code when executing an exit command', async () => {
      const runtime = new DockerExecutor({
        pipelineName: 'Exec Unknown Command Test Job',
        image: 'node:alpine',
        workspacePath,
      })

      await runtime.start()

      const { stdout, exited } = await runtime.exec(['sh', '-c', 'exit 42'])
      const stdoutText = await new Response(stdout).text()
      const exitCode = await exited

      expect(exitCode).toBe(42)
      expect(stdoutText.trim()).toHaveLength(0)

      await runtime.stop()
    })
  })
})
