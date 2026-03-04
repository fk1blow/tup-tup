export type RunnerExecResult = {
  stdout: ReadableStream<Uint8Array<ArrayBuffer>>
  stderr: ReadableStream<Uint8Array<ArrayBuffer>>
  exited: Promise<number>
}

export interface Runner {
  exec: (cmd: string[]) => Promise<RunnerExecResult>
}
