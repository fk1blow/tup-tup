import mergeStreams from '@sindresorhus/merge-streams'
import type { Subprocess } from 'bun'
import { Readable } from 'node:stream'
import type { ReadStream } from 'node:tty'
import type { ExecResult, Executor } from './executor'
import type { Lifecycle } from './lifecycle'

export class DockerExecutor implements Executor, Lifecycle {
  private _imageName: string
  private _containerName: string
  private _sharedVolume: string
  // private _workspacePath: string
  // private _logFilePath: string
  private _containerId: string | null = null
  // private _logProcess: Subprocess<'inherit', 'pipe', 'pipe'> | null = null

  constructor(opts: {
    image: string
    name: string
    sharedVolume: string
    // workspacePath: string
    // logFilePath: string
  }) {
    const { image, name } = opts
    this._imageName = image
    this._containerName = `tuptup-${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
    this._sharedVolume = opts.sharedVolume
    // this._workspacePath = workspacePath
    // this._logFilePath = logFilePath
  }

  get containerName() {
    return this._containerName
  }

  get containerId() {
    return this._containerId
  }

  async start() {
    const runArgs = ['docker', 'run', '-d']
    const workingDirArgs = [
      // TODO don't need mounts anymore
      // '-v',
      // `${this._workspacePath}:/workspace`,
      // Workspace
      '-w',
      '/workspace',
      // Shared volume
      '--mount',
      `src=${this._sharedVolume},dst=/workspace/artifacts,type=volume`,
    ]
    const nameArg = `--name=${this._containerName}`
    const imageArg = this._imageName
    const keepAliveArgs = ['tail', '-f', '/dev/null']

    const subprocess = Bun.spawn(
      [...runArgs, ...workingDirArgs, nameArg, imageArg, ...keepAliveArgs],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    const stdoutText = await new Response(subprocess.stdout).text()
    const stderrText = await new Response(subprocess.stderr).text()

    if (stdoutText.trim()) {
      this._containerId = stdoutText.trim()
    }

    const exitCode = await subprocess.exited

    if (exitCode !== 0) {
      throw new Error(stderrText || `Docker failed with exit code ${exitCode}`)
    }

    // this._logProcess = Bun.spawn(['docker', 'logs', '-f', this._containerId!], {
    //   stdout: 'pipe',
    //   stderr: 'pipe',
    // })

    // const merged = mergeStreams(
    //   [this._logProcess.stdout, this._logProcess.stderr].map(stream =>
    //     Readable.fromWeb(stream),
    //   ),
    // )
    // Bun.write(this._logFilePath, new Response(Readable.toWeb(merged)))
  }

  async exec(cmd: string[]): Promise<ExecResult> {
    if (!this._containerId) {
      // TODO replace this with a more specific error type
      throw new Error(
        'Unable to execute command: Docker container is not running',
      )
    }

    const subprocess: Subprocess<'inherit', 'pipe', 'pipe'> = Bun.spawn(
      ['docker', 'exec', this._containerId, ...cmd],
      {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    // const logger = new LoggerService()
    // await logger.pipe(subprocess.stdout, subprocess.stderr)

    return {
      // stdout: subprocess.stdout,
      // stderr: subprocess.stderr,
      exitCode: subprocess.exited,
    }
  }

  async stop() {
    if (!this._containerId) return

    // this._logProcess?.kill()
    // await this._logProcess?.exited
    // this._logProcess = null

    const subprocess = Bun.spawn(['docker', 'rm', '-f', this._containerId], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    this._containerId = null

    // TODO could be useful to log this error output somewhere instead of just swallowing it
    // const _errorOutput = await new Response(subprocess.stderr).text()

    await subprocess.exited
  }

  async kill() {
    if (!this._containerId) return

    const subprocess = Bun.spawn(['docker', 'kill', this._containerId], {
      stdout: 'inherit',
      stderr: 'inherit',
    })

    // this._logProcess?.kill()
    // await this._logProcess?.exited
    // this._logProcess = null

    await subprocess.exited
  }
}

type Foo =
  | { type: 'asdfasd' }
  | {
      type: 'bbb'
    }
