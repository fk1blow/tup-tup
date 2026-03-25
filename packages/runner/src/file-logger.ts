import mergeStreams from '@sindresorhus/merge-streams'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { Logger } from './logger'

export class FileLogger implements Logger {
  private _writableStream: WritableStream<Uint8Array> =
    this.createWritableStream()

  constructor(private logFilePath: string) {}

  async pipe(...streams: ReadableStream[]): Promise<void> {
    const readableStreams = streams.map(stream => Readable.fromWeb(stream))

    // Merge the streams and convert back to a web stream
    const mergedStream: ReadableStream<Uint8Array> = Readable.toWeb(
      mergeStreams(readableStreams),
    )

    // Pipe the merged stream to the writable stream
    await mergedStream.pipeTo(this._writableStream, {
      preventClose: true,
    })
  }

  async stop(): Promise<void> {
    await this._writableStream.getWriter().close()
  }

  private createWritableStream(): WritableStream<Uint8Array> {
    const file = Bun.file(path.join(`${this.logFilePath}.log`))
    const writer = file.writer()

    const decoder = new TextDecoder()
    let buffer = ''

    return new WritableStream<Uint8Array>({
      write(chunk) {
        buffer += decoder.decode(chunk, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line) writer.write(`${line}\n`)
        }
      },

      async close() {
        if (buffer) writer.write(`${buffer}\n`)
        await writer.flush()
        writer.end()
      },

      async abort(_reason) {
        if (buffer) writer.write(buffer + '\n')
        await writer.flush()
        writer.end()
      },
    })
  }
}
