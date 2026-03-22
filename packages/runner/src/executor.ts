import type { Subprocess } from 'bun'
import type { Lifecycle } from './lifecycle'

export type ExecResult = Subprocess<'inherit', 'pipe', 'pipe'>

export interface Executor {
  exec: (cmd: string[]) => Promise<ExecResult>
  kill: () => Promise<void>
}

export interface ExecutorFactory {
  create(opts: { image: string; name: string }): Executor & Lifecycle
}
