export interface ArtifactStore {
  saveArtifact(opts: { artifact: string; job: string }): Promise<void>
  getArtifact(opts: { artifact: string; job: string }): Promise<any>
}
