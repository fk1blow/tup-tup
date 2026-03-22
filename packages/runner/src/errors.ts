// TODO needs to use this
export class JobTimeoutError extends Error {
  constructor(jobName: string, timeoutMs: number) {
    super(`Job "${jobName}" timed out after ${timeoutMs}ms`)
    this.name = 'JobTimeoutError'
  }
}

// TODO needs to use this
export class JobExecutionError extends Error {
  constructor(jobName: string, message: string) {
    super(`Job "${jobName}" failed: ${message}`)
    this.name = 'JobExecutionError'
  }
}
