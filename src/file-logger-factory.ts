import { FileLogger } from './file-logger'
import type { Logger, LoggerFactory } from './logger'

export class FileLoggerFactory implements LoggerFactory {
  constructor(private logsPath: string) {}

  create(jobName: string): Logger {
    return new FileLogger({ logsPath: this.logsPath, jobName })
  }
}
