import { test, expect, mock, beforeEach, afterEach, type Mock } from 'bun:test'
import { ApiClient } from '../src/api-client'

let originalFetch: typeof fetch
let mockFetch: Mock<(...args: Parameters<typeof fetch>) => Promise<Response>>

beforeEach(() => {
  originalFetch = globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function setupFetch(response: Response) {
  mockFetch = mock(() => Promise.resolve(response))
  globalThis.fetch = mockFetch as unknown as typeof fetch
}

test('health() returns status ok', async () => {
  setupFetch(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))

  const client = new ApiClient('http://localhost:3000')
  const result = await client.health()

  expect(result).toEqual({ status: 'ok' })
  expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/health')
})

test('health() throws on non-ok response', async () => {
  setupFetch(new Response('', { status: 500, statusText: 'Internal Server Error' }))

  const client = new ApiClient('http://localhost:3000')
  await expect(client.health()).rejects.toThrow('Health check failed: 500 Internal Server Error')
})

test('listRuns() returns runs list', async () => {
  const mockRuns = { runs: [{ runId: '123', status: 'completed' }] }
  setupFetch(new Response(JSON.stringify(mockRuns), { status: 200 }))

  const client = new ApiClient('http://localhost:3000')
  const result = await client.listRuns()

  expect(result).toEqual(mockRuns)
  expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/runs')
})

test('triggerRun() sends POST with repo url and branch', async () => {
  const mockResponse = { runId: '456', repoUrl: 'https://github.com/test/repo', branch: 'main' }
  setupFetch(new Response(JSON.stringify(mockResponse), { status: 200 }))

  const client = new ApiClient('http://localhost:3000')
  const result = await client.triggerRun('https://github.com/test/repo', 'main')

  expect(result).toEqual(mockResponse)
  expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl: 'https://github.com/test/repo', branch: 'main' }),
  })
})

test('getRunStatus() fetches run by id', async () => {
  const mockRun = { runId: '789', status: 'running' }
  setupFetch(new Response(JSON.stringify(mockRun), { status: 200 }))

  const client = new ApiClient('http://localhost:3000')
  const result = await client.getRunStatus('789')

  expect(result).toEqual(mockRun)
  expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/runs/789')
})

test('getJobLogs() fetches job logs as text', async () => {
  const mockLogs = 'Line 1\nLine 2\nLine 3'
  setupFetch(new Response(mockLogs, { status: 200 }))

  const client = new ApiClient('http://localhost:3000')
  const result = await client.getJobLogs('123', 'build')

  expect(result).toBe(mockLogs)
  expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/runs/123/logs/build')
})

test('strips trailing slash from base URL', async () => {
  setupFetch(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))

  const client = new ApiClient('http://localhost:3000/')
  await client.health()

  expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/health')
})
