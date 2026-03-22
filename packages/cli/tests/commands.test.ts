import { test, expect, describe } from 'bun:test'

// Test that commands are properly defined by importing them directly
import start from '../src/commands/start'
import stop from '../src/commands/stop'
import run from '../src/commands/run'
import list from '../src/commands/list'
import status from '../src/commands/status'
import logs from '../src/commands/logs'

// Helper to extract meta/args from citty commands (handles Resolvable type)
const getMeta = (cmd: { meta?: unknown }) => cmd.meta as { name?: string; description?: string } | undefined
const getArgs = <T>(cmd: { args?: unknown }) => cmd.args as T | undefined

describe('CLI commands', () => {
  test('start command has correct meta', () => {
    const meta = getMeta(start)
    const args = getArgs<{ build?: unknown; port?: unknown }>(start)
    expect(meta?.name).toBe('start')
    expect(meta?.description).toContain('start')
    expect(args?.build).toBeDefined()
    expect(args?.port).toBeDefined()
  })

  test('stop command has correct meta', () => {
    const meta = getMeta(stop)
    expect(meta?.name).toBe('stop')
    expect(meta?.description).toContain('Stop')
  })

  test('run command has correct meta and args', () => {
    const meta = getMeta(run)
    const args = getArgs<{ repoUrl?: unknown; branch?: unknown; url?: unknown }>(run)
    expect(meta?.name).toBe('run')
    expect(meta?.description).toContain('pipeline')
    expect(args?.repoUrl).toBeDefined()
    expect(args?.branch).toBeDefined()
    expect(args?.url).toBeDefined()
  })

  test('list command has correct meta', () => {
    const meta = getMeta(list)
    const args = getArgs<{ url?: unknown }>(list)
    expect(meta?.name).toBe('list')
    expect(meta?.description).toContain('List')
    expect(args?.url).toBeDefined()
  })

  test('status command has correct meta and args', () => {
    const meta = getMeta(status)
    const args = getArgs<{ runId?: unknown; url?: unknown }>(status)
    expect(meta?.name).toBe('status')
    expect(meta?.description).toContain('status')
    expect(args?.runId).toBeDefined()
    expect(args?.url).toBeDefined()
  })

  test('logs command has correct meta and args', () => {
    const meta = getMeta(logs)
    const args = getArgs<{ runId?: unknown; job?: unknown; url?: unknown }>(logs)
    expect(meta?.name).toBe('logs')
    expect(meta?.description).toContain('logs')
    expect(args?.runId).toBeDefined()
    expect(args?.job).toBeDefined()
    expect(args?.url).toBeDefined()
  })
})
