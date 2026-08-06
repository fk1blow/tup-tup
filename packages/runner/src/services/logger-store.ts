export interface LoggerStore {
  log(opts: { message: string; job: string }): Promise<void>
}
