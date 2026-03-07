export interface Executor {
  start: () => Promise<void>
  stop: () => Promise<void>
}
