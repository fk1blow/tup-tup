# Factories Factories Everywhere

> tl;dr we shift the responsabilities from the Workflow, invert the control and instead of providing concrete classes, we require factories that implement certain interfaces. Thus executors and loggers can be easily swapped and tested.

Renames:
- Workflow → JobOrchestrator

ExecutorFactory:
```ts
interface ExecutorFactory {
  create(opts: { name: string, image: string }): Executor & Lifecycle
}
```
- DockerExecutorFactory holds workspacePath, passes it at construction
- DockerExecutor implements Executor + Lifecycle, start() is parameterless

LoggerFactory:
```ts
interface LoggerFactory {
  create(jobName: string): Logger
}
```
- FileLoggerFactory holds logsPath

Logger:
```ts
interface Logger {
  pipe(stdout: ReadableStream, stderr: ReadableStream): Promise<void>
  stop(): Promise<void>
}
```
- Merging logic moves here from Job

Runner creates factories with paths from PipelineContext, injects them into
JobOrchestrator.

Job becomes simpler — just calls logger.pipe(stdout, stderr).

## Testing

When testing the JobOrchestrator, i can pass my own TestExecutor factory
