import { describe, expect, test } from 'bun:test'
import { parseJobDefinition } from '../src/cli'

describe.skip('Cli', () => {
  test('parses a job with a single commands', () => {
    const args = JSON.stringify({
      name: 'Test Job',
      commands: [['echo', 'Hello, Test!']],
    })
    const parsed = parseJobDefinition(args)

    expect(parsed).toEqual({
      name: 'Test Job',
      commands: [['echo', 'Hello, Test!']],
      logsDir: '',
    })
  })

  test('parses a job with multiple commands', () => {
    const args = JSON.stringify({
      name: 'Test Job',
      commands: [
        ['echo', 'Hello, Test!'],
        ['echo', 'Another command'],
      ],
    })
    const parsed = parseJobDefinition(args)

    expect(parsed).toEqual({
      name: 'Test Job',
      commands: [
        ['echo', 'Hello, Test!'],
        ['echo', 'Another command'],
      ],
      logsDir: '',
    })
  })

  test('fails to parse a job with no commands', () => {
    const args = JSON.stringify({ name: 'Test Job', commands: [] })
    const parsed = parseJobDefinition(args)

    expect(parsed).toBeUndefined()
  })

  test('fails to parse an empty string', () => {
    const args = JSON.stringify('')
    const parsed = parseJobDefinition(args)

    expect(parsed).toBeUndefined()
  })
})
