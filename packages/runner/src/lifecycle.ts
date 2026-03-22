export interface Lifecycle<TStart = void, TStop = void> {
  start: () => Promise<TStart>
  stop: () => Promise<TStop>
}
