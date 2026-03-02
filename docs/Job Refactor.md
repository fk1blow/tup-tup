# Job Refactor

Theres no need for the Job to be a subprocess by itself.
For better flexibility, it could be injected with a Logger interface(eg: when testing)
and an emitter.

## Overview

The Orchestrator doesn't have to know about the Logger's internals.
The Logger would also have the Emitter injected, so that it can close after
each job's finished.

The orchestrator would hook into the emitter:

- tracking progress
- schedule next job

Other listeners hook into the Emitter:

- metrics(how much it took for a job to complete)
- stats(how many jobs, etc)
- web hooks
- notifications

```
  Orchestrator
    │
    ├── creates Job(definition, { logger, emitter })
    ├── listens to emitter events (job:started, command:finished, etc.)
    └── doesn't care how logging works

  Job
    │
    ├── runs commands (Bun.spawn - these are subprocesses)
    ├── emitter.emit('command:finished', result)
    └── logger.write(stdout/stderr chunks)

  Logger (injected)
    └── writes to files, console, whatever - Job doesn't care

  Emitter (injected)
    └── EventEmitter, or mock array in tests
```

## Logger dependency

need an interface like

```ts
interface Logger {
  write: (chunk: Chunk | string) => void;
}
```

## Emitter dependency

need an interface like

```ts
interface Emitter {
  emit: (event: string, mesasge: string | unknown) => void;
  on: (event: string, callback: Fn) => void;
}
```

## Testing

```ts
const messages: JobMessage[] = [];
const logs: string[] = [];

const job = new Job(definition, {
  emitter: { emit: (msg) => messages.push(msg) },
  logger: { write: (chunk) => logs.push(chunk) },
});
```

## Testing strict order

```ts
const events: string[] = [];

const job = new Job(definition, {
  emitter: {
    emit: (msg) => events.push(`emit:${msg.type}`),
  },
  logger: {
    write: (chunk) => events.push(`log:${chunk.trim()}`),
  },
});

await job.run();

expect(events).toEqual([
  "emit:job:started",
  "emit:command:started",
  "log:hello world", // stdout before command:finished
  "emit:command:finished",
  "emit:job:finished",
]);
```
