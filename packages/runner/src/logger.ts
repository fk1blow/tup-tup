export interface Logger {
  pipe(...streams: ReadableStream[]): Promise<void>
  stop(): Promise<void>
}

export type LoggerFactory = (logFilePath: string) => Logger
