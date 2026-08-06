import type { Lifecycle } from './lifecycle'

export type ExecResult = {
  // stdout: ReadableStream
  // stderr: ReadableStream
  exitCode: Promise<number>
}

export interface Executor {
  exec: (cmd: string[]) => Promise<ExecResult>
  kill: () => Promise<void>
}

export type ExecutorFactory<TOptions> = (opts: TOptions) => Executor & Lifecycle
