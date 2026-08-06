import type { LoggerStore } from './logger-store'

export class VolumeLoggerStore implements LoggerStore {
  private _volumeName: string

  constructor(volumeName: string) {
    this._volumeName = volumeName
  }

  async log(opts: { message: string; job: string }): Promise<void> {
    //
  }
}
