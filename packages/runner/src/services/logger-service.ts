import mergeStreams from '@sindresorhus/merge-streams'
import { Readable } from 'node:stream'

export class LoggerService {
  constructor() {}

  async pipe(...streams: ReadableStream[]): Promise<void> {
    const readableStreams = streams.map(stream => Readable.fromWeb(stream))

    const combinedStreams: ReadableStream<Uint8Array> = Readable.toWeb(
      mergeStreams(readableStreams),
    )

    await fetch('http://localhost:3000', {
      method: 'POST',
      body: combinedStreams,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
