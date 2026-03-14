export interface Logger {
  pipe(...streams: ReadableStream[]): Promise<void>
  stop(): Promise<void>
}

export interface LoggerFactory {
  create(jobName: string): Logger
}
