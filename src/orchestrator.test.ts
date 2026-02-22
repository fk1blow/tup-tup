import { describe, expect, test } from 'bun:test'
import { Job } from './job.types'
import { Orchestrator } from './orchestrator'

const mockJob: Job = {
  name: 'Mock Job',
  cmd: ['echo', 'Hello, World!'],
  // execute: async () => {
  //   // Simulate job execution
  //   return new Promise(resolve => setTimeout(resolve, 100))
  // },
}

describe('Orchestrator', () => {
  test('should initialize orchestrator with empty pipelines and inactive state', () => {
    const orchestrator = new Orchestrator([mockJob])
    const state = orchestrator.getPipelineState()
    expect(state.status).toBe('inactive')
    expect(state.job).toBeNull()
  })

  test('start a mocked job and update state to running', async () => {
    const orchestrator = new Orchestrator([mockJob])
    await orchestrator.start()
    const state = orchestrator.getPipelineState()
    expect(state.status).toBe('running')
    expect(state.job).toBe(mockJob.name)
  })

  test.only('foo', async () => {
    Bun.spawn(['bun', 'run', './src/job.ts'])
  })
})
