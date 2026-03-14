import type { Lifecycle } from './lifecycle'

export type ExecResult = {
  stdout: ReadableStream<Uint8Array<ArrayBuffer>>
  stderr: ReadableStream<Uint8Array<ArrayBuffer>>
  exited: Promise<number>
}

export interface Executor {
  exec: (cmd: string[]) => Promise<ExecResult>
}

export interface ExecutorFactory {
  create(opts: {
    image: string
    name: string
    workspacePath: string
  }): Executor & Lifecycle
}
