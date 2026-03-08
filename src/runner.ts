// This is another thing, way higher up on the abstraction
// It should replace the Pipeline as the Top level abstraction
//
// Runner (top-level)
// ├── Provisioner
// ├── Workflow
// │   ├── Executor (lifecycle)
// │   └── Job (only exec)
// └── Teardown
//
// Old/previous abstraction:
//
// export type RunnerExecResult = {
//   stdout: ReadableStream<Uint8Array<ArrayBuffer>>
//   stderr: ReadableStream<Uint8Array<ArrayBuffer>>
//   exited: Promise<number>
// }

// export interface Runner {
//   exec: (cmd: string[]) => Promise<RunnerExecResult>
// }
