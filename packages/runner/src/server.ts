import { existsSync } from 'fs'

const port = process.env.TUP_TUP_PORT ?? 3000
const runsPath = process.env.TUP_TUP_RUNS_PATH

if (!runsPath) {
  console.error('ERROR: TUP_TUP_RUNS_PATH is required')
  process.exit(1)
}

if (!existsSync(runsPath)) {
  console.error(`ERROR: TUP_TUP_RUNS_PATH (${runsPath}) does not exist`)
  process.exit(1)
}

const server = Bun.serve({
  port,
  routes: {
    '/health': {
      GET: () => Response.json({ status: 'ok' }),
    },

    '/runs': {
      GET: () => {
        // TODO: list runs from runsPath
        return Response.json({ runs: [] })
      },
      POST: async req => {
        // TODO: trigger a new run
        const body = await req.json()
        const { repoUrl, branch } = body
        return Response.json({ runId: 'not-implemented', repoUrl, branch })
      },
    },

    '/runs/:id': {
      GET: req => {
        // TODO: get run details
        const { id } = req.params
        return Response.json({ runId: id, status: 'not-implemented' })
      },
    },

    '/runs/:id/logs/:job': {
      GET: req => {
        // TODO: get job logs
        const { id, job } = req.params
        return new Response(`Logs for ${job} in run ${id}: not implemented`, {
          headers: { 'Content-Type': 'text/plain' },
        })
      },
    },

    '/runs/:id/events': {
      GET: req => {
        const stream = new ReadableStream({
          async start(controller) {
            const events = [
              { type: 'run:started', runId: req.params.id },
              { type: 'job:started', job: 'build' },
              { type: 'job:settled', job: 'build', success: true },
              { type: 'job:started', job: 'test' },
              { type: 'job:settled', job: 'test', success: true },
              { type: 'run:completed', success: true },
            ]
            for (const event of events) {
              controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
              await Bun.sleep(500)
            }
            controller.close()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})

console.log(`tup-tup runner listening on http://localhost:${server.port}`)
