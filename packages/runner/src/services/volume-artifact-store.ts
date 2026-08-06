import type { ArtifactStore } from './artifact-store'

export class VolumeArtifactStore implements ArtifactStore {
  constructor(private volumePath: string) {}

  async saveArtifact(opts: { artifact: string; job: string }): Promise<void> {
    // TODO
    return Promise.resolve()
  }
  async getArtifact(opts: { artifact: string; job: string }): Promise<any> {
    return Promise.resolve()
  }
}
