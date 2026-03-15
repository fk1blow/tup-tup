import type { Subprocess } from 'bun'
import type { ExecResult, Executor } from './executor'
import type { Lifecycle } from './lifecycle'

export class DockerExecutor implements Executor, Lifecycle {
  private _imageName: string
  private _containerName: string
  private _workspacePath: string
  private _id: string | null = null

  constructor(opts: {
    image: string
    pipelineName: string
    workspacePath: string
  }) {
    const { image, pipelineName, workspacePath } = opts
    this._imageName = image
    this._containerName = `tuptup-${pipelineName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
    this._workspacePath = workspacePath
  }

  get containerName() {
    return this._containerName
  }

  get containerId() {
    return this._id
  }

  async start() {
    const runArgs = ['docker', 'run', '-d']
    const workingDirArgs = [
      '-v',
      `${this._workspacePath}:/workspace`,
      '-w',
      '/workspace/app',
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
      this._id = stdoutText.trim()
    }

    const exitCode = await subprocess.exited

    if (exitCode !== 0) {
      throw new Error(stderrText || `Docker failed with exit code ${exitCode}`)
    }
  }

  async exec(cmd: string[]): Promise<ExecResult> {
    if (!this._id) {
      throw new Error('Container is not running')
    }

    const subprocess: Subprocess<'inherit', 'pipe', 'pipe'> = Bun.spawn(
      ['docker', 'exec', this._id, ...cmd],
      {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    const { exited, stdout, stderr } = subprocess

    return {
      exited,
      stdout,
      stderr,
    }
  }

  async stop() {
    if (!this._id) return

    const subprocess = Bun.spawn(['docker', 'rm', '-f', this._id], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    this._id = null

    // TODO could be useful to log this error output somewhere instead of just swallowing it
    // const _errorOutput = await new Response(subprocess.stderr).text()

    await subprocess.exited
  }
}
