export type CommandRunnerResult = {
  stdout: ReadableStream<Uint8Array<ArrayBuffer>>
  stderr: ReadableStream<Uint8Array<ArrayBuffer>>
  exited: Promise<number>
}

export interface CommandRunner {
  exec: (cmd: string[]) => Promise<CommandRunnerResult>
}
