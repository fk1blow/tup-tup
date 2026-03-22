import { test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { ApiClient } from '../src/api-client'

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('health() returns status ok', async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
  )

  const client = new ApiClient('http://localhost:3000')
  const result = await client.health()

  expect(result).toEqual({ status: 'ok' })
  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health')
})

test('health() throws on non-ok response', async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response('', { status: 500, statusText: 'Internal Server Error' }))
  )

  const client = new ApiClient('http://localhost:3000')
  await expect(client.health()).rejects.toThrow('Health check failed: 500 Internal Server Error')
})

test('listRuns() returns runs list', async () => {
  const mockRuns = { runs: [{ runId: '123', status: 'completed' }] }
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify(mockRuns), { status: 200 }))
  )

  const client = new ApiClient('http://localhost:3000')
  const result = await client.listRuns()

  expect(result).toEqual(mockRuns)
  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/runs')
})

test('triggerRun() sends POST with repo url and branch', async () => {
  const mockResponse = { runId: '456', repoUrl: 'https://github.com/test/repo', branch: 'main' }
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }))
  )

  const client = new ApiClient('http://localhost:3000')
  const result = await client.triggerRun('https://github.com/test/repo', 'main')

  expect(result).toEqual(mockResponse)
  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl: 'https://github.com/test/repo', branch: 'main' }),
  })
})

test('getRunStatus() fetches run by id', async () => {
  const mockRun = { runId: '789', status: 'running' }
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify(mockRun), { status: 200 }))
  )

  const client = new ApiClient('http://localhost:3000')
  const result = await client.getRunStatus('789')

  expect(result).toEqual(mockRun)
  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/runs/789')
})

test('getJobLogs() fetches job logs as text', async () => {
  const mockLogs = 'Line 1\nLine 2\nLine 3'
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(mockLogs, { status: 200 }))
  )

  const client = new ApiClient('http://localhost:3000')
  const result = await client.getJobLogs('123', 'build')

  expect(result).toBe(mockLogs)
  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/runs/123/logs/build')
})

test('strips trailing slash from base URL', async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
  )

  const client = new ApiClient('http://localhost:3000/')
  await client.health()

  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health')
})
