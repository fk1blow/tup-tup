import type { Subprocess } from 'bun'
import type { Executor } from './executor'
import type { Runner, RunnerExecResult } from './runner'

export class DockerExecutor implements Executor, Runner {
  private _image: string
  private _name: string
  private _id: string | null = null

  constructor({ image, name }: { image: string; name: string }) {
    this._image = image
    this._name = `tuptup-${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
  }

  get containerName() {
    return this._name
  }

  get containerId() {
    return this._id
  }

  async start() {
    const runArgs = ['docker', 'run', '-d']
    const nameArg = `--name=${this._name}`
    const imageArg = this._image
    const keepAliveArgs = ['tail', '-f', '/dev/null']

    const subprocess = Bun.spawn(
      [...runArgs, nameArg, imageArg, ...keepAliveArgs],
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

  async exec(cmd: string[]): Promise<RunnerExecResult> {
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
