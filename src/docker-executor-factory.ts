import { DockerExecutor } from './docker-executor'
import type { ExecutorFactory } from './executor'

export class DockerExecutorFactory implements ExecutorFactory {
  constructor(private workspacePath: string) {}

  create(opts: { image: string; name: string }) {
    return new DockerExecutor({ ...opts, workspacePath: this.workspacePath })
  }
}
