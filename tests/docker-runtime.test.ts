import { describe, expect, it, spyOn } from 'bun:test'
import {
  filterRunningContainers,
  removeContainerByName,
} from '../src/container.test-helpers'
import { DockerRuntime } from '../src/docker-runtime'

const containerNamePattern = /^tuptup-[\w-]+-\d+$/
const containerIdPattern = /^[0-9a-f]{12,64}$/

describe('Docker Runtime', async () => {
  describe('Lifecycle', async () => {
    it('should create an instance', () => {
      const runtime = new DockerRuntime({
        name: 'Test Job',
        image: 'node:alpine',
      })

      expect(runtime.containerName).toMatch(containerNamePattern)
    })

    it('should start container then stop it', async () => {
      const runtime = new DockerRuntime({
        name: 'Start Test Job',
        image: 'node:alpine',
      })

      await runtime.start()
      expect(runtime.containerName).toMatch(containerNamePattern)
      expect(runtime.containerId).toMatch(containerIdPattern)

      let runningContainers = await filterRunningContainers(
        runtime.containerName,
      )
      expect(runningContainers.length).toBe(1)

      await runtime.stop()
      expect(runtime.containerId).toBeNull()

      runningContainers = await filterRunningContainers(runtime.containerName)
      expect(runningContainers.length).toBe(0)
    })

    it('should be able to stop a container already removed externally', async () => {
      const runtime = new DockerRuntime({
        name: 'Stop Test Job',
        image: 'node:alpine',
      })

      await runtime.start()

      await removeContainerByName(runtime.containerName)
      expect(runtime.stop()).resolves.toBeUndefined()
      expect(runtime.containerId).toBeNull()
    })

    it('should throw an error when starting a container with an invalid image', async () => {
      const runtime = new DockerRuntime({
        name: 'Invalid Image Test Job',
        image: 'nonexistent:image',
      })

      // This is fine
      await expect(runtime.start()).rejects.toThrow(
        /Unable to find image 'nonexistent:image'/,
      )
    })

    it('should error when starting a container with the same name as an existing one', async () => {
      const spy = spyOn(Date, 'now').mockReturnValue(6666666666666)

      const runtime1 = new DockerRuntime({
        name: 'Duplicate Name Test Job',
        image: 'node:alpine',
      })
      await runtime1.start()

      const runtime2 = new DockerRuntime({
        name: 'Duplicate Name Test Job',
        image: 'node:alpine',
      })

      spy.mockRestore()

      let runningContainers = await filterRunningContainers(
        runtime1.containerName,
      )
      expect(runningContainers.length).toBe(1)

      // This is fine
      await expect(runtime2.start()).rejects.toThrow(
        /Conflict. The container name "\/tuptup-duplicate-name-test-job-\d+" is already in use/,
      )

      await runtime1.stop()

      runningContainers = await filterRunningContainers(runtime1.containerName)
      expect(runningContainers.length).toBe(0)
    })
  })

  describe.only('Commands', async () => {
    it('should execute a command inside the container', async () => {
      const runtime = new DockerRuntime({
        name: 'Exec Command Test Job',
        image: 'node:alpine',
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
      const runtime = new DockerRuntime({
        name: 'Exec Multiple Commands Test Job',
        image: 'node:alpine',
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
      const runtime = new DockerRuntime({
        name: 'Exec Unknown Command Test Job',
        image: 'node:alpine',
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
      const runtime = new DockerRuntime({
        name: 'Exec Unknown Command Test Job',
        image: 'node:alpine',
      })

      await runtime.start()

      const { stdout, exited } = await runtime.exec(['sh', '-c', 'exit 42'])
      const stdoutText = await new Response(stdout).text()
      const exitCode = await exited

      expect(exitCode).toBe(42)
      expect(stdoutText.trim()).toHaveLength(0)

      await runtime.stop()
    })

    it('should fail to start a docker runtime with an invalid image', async () => {
      const runtime = new DockerRuntime({
        name: 'Exec Unknown Command Test Job',
        image: 'unknown:image',
      })

      // Trust me bro, this is fine
      await expect(runtime.start()).rejects.toThrow(
        /Unable to find image 'unknown:image'/,
      )
    })
  })
})
