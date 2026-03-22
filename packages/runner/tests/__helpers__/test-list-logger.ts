import mergeStreams from '@sindresorhus/merge-streams'
import { Readable } from 'node:stream'
import type { Logger } from '../../src/logger'

export class TestListLogger implements Logger {
  public logs: string[] = []
  private logStream: WritableStream<Uint8Array>

  constructor() {
    const decoder = new TextDecoder()

    this.logStream = new WritableStream<Uint8Array>({
      write: chunk => {
        const text = decoder.decode(chunk, { stream: true })
        // Split by newlines and add non-empty lines
        for (const line of text.split('\n')) {
          if (line) {
            this.logs.push(line)
          }
        }
      },
    })
  }

  async pipe(...streams: ReadableStream[]): Promise<void> {
    const readableStreams = streams.map(stream => Readable.fromWeb(stream))
    const mergedStream: ReadableStream<Uint8Array> = Readable.toWeb(
      mergeStreams(readableStreams),
    )
    await mergedStream.pipeTo(this.logStream, { preventClose: true })
  }

  async stop() {
    await this.logStream.getWriter().close()
  }
}
