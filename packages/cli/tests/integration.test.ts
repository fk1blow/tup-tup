import { test, expect } from 'bun:test'
import { resolve } from 'path'

const cliPath = resolve(import.meta.dir, '../src/main.ts')

async function runCli(...args: string[]): Promise<string> {
  const proc = Bun.spawn(['bun', cliPath, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  await proc.exited

  // citty may output to either stdout or stderr
  return stdout + stderr
}

test('--help shows usage information', async () => {
  const output = await runCli('--help')
  expect(output).toContain('tup-tup')
  expect(output).toContain('CLI for tup-tup CI/CD pipeline runner')
})

test('--version shows version', async () => {
  const output = await runCli('--version')
  expect(output).toContain('0.1.0')
})

test('start --help shows start command options', async () => {
  const output = await runCli('start', '--help')
  expect(output).toContain('start')
  expect(output).toContain('--build')
  expect(output).toContain('--port')
})

test('run --help shows run command options', async () => {
  const output = await runCli('run', '--help')
  expect(output).toContain('run')
  expect(output).toContain('--branch')
  expect(output).toContain('--url')
})

test('list --help shows list command options', async () => {
  const output = await runCli('list', '--help')
  expect(output).toContain('list')
  expect(output).toContain('--url')
})

test('logs --help shows logs command options', async () => {
  const output = await runCli('logs', '--help')
  expect(output).toContain('logs')
  expect(output).toContain('--url')
})
