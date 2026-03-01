import { describe, expect, it, spyOn } from 'bun:test'
import { Container } from './container'
import {
  filterRunningContainers,
  removeContainerByName,
} from './container.test-helpers'

const containerNamePattern = /^tuptup-[\w-]+-\d+$/
const containerIdPattern = /^[0-9a-f]{12,64}$/

describe('Container', async () => {
  it('should create an instance', () => {
    const container = new Container({
      name: 'Test Job',
      commands: [['echo', 'hello world']],
      image: 'node:alpine',
    })

    expect(container.containerName).toMatch(containerNamePattern)
  })

  it('should start container then stop it', async () => {
    const container = new Container({
      name: 'Start Test Job',
      commands: [['echo', 'starting container']],
      image: 'node:alpine',
    })

    await container.start()
    expect(container.containerName).toMatch(containerNamePattern)
    expect(container.containerId).toMatch(containerIdPattern)

    let runningContainers = await filterRunningContainers(
      container.containerName,
    )
    expect(runningContainers.length).toBe(1)

    await container.stop()
    expect(container.containerId).toBeNull()

    runningContainers = await filterRunningContainers(container.containerName)
    expect(runningContainers.length).toBe(0)
  })

  it('should be able to stop a container already removed externally', async () => {
    const container = new Container({
      name: 'Stop Test Job',
      commands: [['echo', 'stopping container']],
      image: 'node:alpine',
    })

    await container.start()

    await removeContainerByName(container.containerName)
    expect(container.stop()).resolves.toBeUndefined()
    expect(container.containerId).toBeNull()
  })

  it('should throw an error when starting a container with an invalid image', async () => {
    const container = new Container({
      name: 'Invalid Image Test Job',
      commands: [['echo', 'invalid image']],
      image: 'nonexistent:image',
    })

    // This is fine
    await expect(container.start()).rejects.toThrow(
      /Unable to find image 'nonexistent:image'/,
    )
  })

  it('should error when starting a container with the same name as an existing one', async () => {
    const spy = spyOn(Date, 'now').mockReturnValue(1772399089146)

    const container1 = new Container({
      name: 'Duplicate Name Test Job',
      commands: [['echo', 'first container']],
      image: 'node:alpine',
    })
    await container1.start()

    const container2 = new Container({
      name: 'Duplicate Name Test Job',
      commands: [['echo', 'second container']],
      image: 'node:alpine',
    })

    let runningContainers = await filterRunningContainers(
      container1.containerName,
    )
    expect(runningContainers.length).toBe(1)

    // This is fine
    await expect(container2.start()).rejects.toThrow(
      /Conflict. The container name "\/tuptup-duplicate-name-test-job-\d+" is already in use/,
    )

    await container1.stop()

    runningContainers = await filterRunningContainers(container1.containerName)
    expect(runningContainers.length).toBe(0)

    spy.mockRestore()
  })
})
