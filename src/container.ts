import type { JobDefinition } from './job.types'

export class Container {
  private _name: string
  private _dockerContainerId: string | null = null

  constructor(private job: JobDefinition) {
    const jobName = job.name.replace(/\s+/g, '-').toLowerCase()
    this._name = `tuptup-${jobName}-${Date.now()}`
  }

  get containerName() {
    return this._name
  }

  get containerId() {
    return this._dockerContainerId
  }

  async start() {
    const dockerArgs = ['docker', 'run', '-d']
    const aliveArgs = ['tail', '-f', '/dev/null']
    const nameArg = `--name=${this._name}`

    const subprocess = Bun.spawn(
      [...dockerArgs, nameArg, this.job.image, ...aliveArgs],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    const stdoutText = await new Response(subprocess.stdout).text()
    const stderrText = await new Response(subprocess.stderr).text()

    if (stdoutText.trim()) {
      this._dockerContainerId = stdoutText.trim()
    }

    const exitCode = await subprocess.exited

    if (exitCode !== 0) {
      throw new Error(stderrText || `Docker failed with exit code ${exitCode}`)
    }
  }

  async stop() {
    if (!this._dockerContainerId) return

    const subprocess = Bun.spawn(
      ['docker', 'rm', '-f', this._dockerContainerId],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    this._dockerContainerId = null

    // TODO could be useful to log this error output somewhere instead of just swallowing it
    // const _errorOutput = await new Response(subprocess.stderr).text()

    await subprocess.exited
  }

  async exec() {
    if (!this._dockerContainerId) {
      throw new Error('Container is not running')
    }
  }
}
