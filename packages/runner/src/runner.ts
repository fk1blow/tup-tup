import { rmSync } from 'node:fs'
import { rmdir } from 'node:fs/promises'
import path from 'node:path'
import { DockerExecutor } from './docker-executor'
import { EventsLogger } from './events-logger'
import { JobsLogger } from './jobs-logger'
import { PipelineScheduler } from './pipeline-scheduler'
import { setupProvisioning } from './provisioner'
import type { RuntimeContext } from './runtime-context'

export class Runner {
  private repoUrl: string
  private repoBranch?: string

  constructor(opts: {
    repoUrl: string
    repoBranch?: string
  }) {
    this.repoUrl = opts.repoUrl
    this.repoBranch = opts.repoBranch
  }

  async start() {
    const context = await setupProvisioning({
      repoUrl: this.repoUrl,
      repoBranch: this.repoBranch,
    })

    const eventsLogger = new EventsLogger(context.paths.workspace)

    const completion = this.consumePipeline(context, eventsLogger)

    return {
      context,
      completion,
    }
  }

  private async consumePipeline(ctx: RuntimeContext, logger: EventsLogger) {
    logger.log({
      type: 'run:started',
      pipeline: ctx.pipeline.name,
    })

    const scheduler = new PipelineScheduler({
      runtimeCtx: ctx,
      jobsLoggerFactory: (logFilePath: string) => new JobsLogger(logFilePath),
      dockerExecutorFactory: (opts: {
        workspacePath: string
        image: string
        name: string
      }) => new DockerExecutor(opts),
    })

    let pipelineError: Error | undefined

    try {
      for await (const event of scheduler.schedule()) {
        await logger.log(event)
      }
    } catch (err) {
      pipelineError =
        err instanceof Error
          ? err
          : new Error('Unknown error while running scheduler pipeline')
    } finally {
      await this.teardown(ctx)

      logger.log({
        type: 'run:finished',
        pipeline: ctx.pipeline.name,
        error: pipelineError,
      })

      await logger.close()

      if (pipelineError) throw pipelineError
    }
  }

  private async teardown(ctx: RuntimeContext) {
    // TODO implement teardown logic
    // - workspace: rm -rf /tmp/tuptup/${ctx.id}
    // - clean up doecker containers/images created for this run

    rmSync(ctx.paths.workspace, { recursive: true, force: true })
    // await rmdir(ctx.paths.workspace)
  }
}
