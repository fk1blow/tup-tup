# Job Lifecycle

A job starts after it was spawned by the orchestrator, runs its commands and that's it.

It needs to have a very well defined lifecycle, especially around error handling.
This would impact how the consumer(orchestrator) reacts and the side effects it produces.

## Consistency

For all the paths it might take, a Job should trigger/emit a strict series of events.
For consistency, every possible path "SHOULD" send the same sequence, no matter
what happens, either happy path, failed to spanw or other kinds of errors.

## Types

`JobMessage` represent the type used to communicate its lifecycle

```ts
export type JobMessage =
  | { type: "job:started"; jobName: string }
  | { type: "command:started"; jobName: string; commandIndex: number }
  | {
      type: "command:finished";
      jobName: string;
      commandIndex: number;
      result: JobCommandResult;
    }
  | { type: "job:finished"; jobName: string; success: boolean };
```

## Job Happy path

The happy path means everything went well, job started, ran its commands then finished.

#### flow

- job started (`{ type: 'job:started', jobName: 'foo' }`)
- command started (`{ type: 'command:started', jobName: 'foo', commandIndex: 0 }`)
- command finished (`{ type: 'command:finished', jobName 'foo', commandIndex: 0, result: { type: 'Exited', exitCode: 0 }}`)
- job finished (`{ type: 'job:finished', jobName: 'foo', success: true }`)

## Job fails to start

**For consistency, this would send the same sequence of messages as the "happy path" would.**

`Bun.spawn()` call might fail for various reasons:

- the command is not found(binary doesn't exist or not in PATH)
- the file is not executable
- path is incorrect(not found)
- malformed options passed to `Bun.spawn`(including passing non-string, non-arrays as the command)
- permissions issues(OS-level restrictions)
- resource limits, out of memory, etc

#### flow

**Important: the last message would still be `job:finished`, but with a `success: false`**

- job started `{ type: 'job:started', jobName: 'foo' }`
- command started `{ type: 'command:started', jobName: 'foo', commandIndex: 0 }`
- command finished `{ type: 'command:finished', jobName 'foo', commandIndex: 0, result: {
   type: 'FailedToStart',
   code: 'ENOENT',
   message: 'Executable not found in $PATH: "nonexistent-command-xyz"',
}}`
- job finished (`{ type: 'job:finished', jobName: 'foo', success: false }`)

---

## TODO Remaining Tests to Write

- [x] Exited (exit code 0 and non-zero)
- [x] Killed (SIGTERM/SIGKILL)
- [x] StreamError (deferred — harder to simulate)
