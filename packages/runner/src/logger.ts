// TODO see if this could use the `Lifecycle` interface
export interface Logger {
  pipe(...streams: ReadableStream[]): Promise<void>
  stop(): Promise<void>
}

export type LoggerFactory = (logFilePath: string) => Logger
