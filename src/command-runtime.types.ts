import type { CommandRunner } from './command-runner.types'

export interface CommandRuntime extends CommandRunner {
  start: () => Promise<void>
  stop: () => Promise<void>
}
