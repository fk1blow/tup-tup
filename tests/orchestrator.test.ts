import { describe, expect, test } from 'bun:test'
import { JobDefinition } from '../src/job.types'
import { Orchestrator } from '../src/orchestrator'

const mockJob: JobDefinition = {
  name: 'Mock Job',
  cmd: ['echo', 'Hello, World!'],
  // execute: async () => {
  //   // Simulate job execution
  //   return new Promise(resolve => setTimeout(resolve, 100))
  // },
}

describe('Orchestrator', () => {
  test('should initialize orchestrator with empty pipelines and inactive state', () => {
    const orchestrator = new Orchestrator({ jobs: [mockJob] })
    const state = orchestrator.getPipelineState()
    expect(state.status).toBe('inactive')
    expect(state.job).toBeNull()
  })

  test('start a mocked job and update state to running', async () => {
    const orchestrator = new Orchestrator({ jobs: [mockJob] })
    await orchestrator.start()
    const state = orchestrator.getPipelineState()
    expect(state.status).toBe('running')
    expect(state.job?.name).toBe(mockJob.name)
  })

  test.only('foo', async () => {
    const orchestrator = new Orchestrator({ jobs: [mockJob] })
    await orchestrator.start()
    await orchestrator.getPipelineState().process?.exited

    // await new Promise(resolve => setTimeout(resolve, 1000))
  })
})
