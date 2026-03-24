// TODO see if this could use the `Lifecycle` interface
export interface Logger {
  pipe(...streams: ReadableStream[]): Promise<void>
  stop(): Promise<void>
}

// TODO remove the `jobName` parameter, remove coupling
export interface LoggerFactory {
  create(jobName: string): Logger
}
