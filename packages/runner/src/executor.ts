import type { Subprocess } from 'bun'
import type { Lifecycle } from './lifecycle'

export type ExecResult = Subprocess<'inherit', 'pipe', 'pipe'>

export interface Executor {
  exec: (cmd: string[]) => Promise<ExecResult>
  kill: () => Promise<void>
}

export type ExecutorFactoryOpts = {
  workspacePath: string
  image: string
  name: string
}

export type ExecutorFactory = (
  opts: ExecutorFactoryOpts,
) => Executor & Lifecycle
