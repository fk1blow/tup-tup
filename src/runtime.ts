export interface Runtime {
  start: () => Promise<void>
  stop: () => Promise<void>
}
