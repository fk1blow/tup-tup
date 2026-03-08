export type ExecResult = {
  stdout: ReadableStream<Uint8Array<ArrayBuffer>>
  stderr: ReadableStream<Uint8Array<ArrayBuffer>>
  exited: Promise<number>
}

export interface Executor {
  exec: (cmd: string[]) => Promise<ExecResult>
}
