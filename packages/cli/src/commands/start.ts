import { defineCommand } from 'citty'
import { CONTAINER_NAME, IMAGE_NAME } from '../config'

export default defineCommand({
  meta: {
    name: 'start',
    description: 'Build and start the tup-tup runner container',
  },
  args: {
    build: {
      type: 'boolean',
      description: 'Rebuild the Docker image before starting',
      default: false,
    },
    port: {
      type: 'string',
      description: 'Port to expose the runner on',
      default: '3000',
    },
  },
  async run({ args }) {
    const { build, port } = args

    if (build) {
      console.log('Building Docker image...')
      const buildResult = await Bun.$`docker build -t ${IMAGE_NAME} ./packages/runner`.quiet()
      if (buildResult.exitCode !== 0) {
        console.error('Failed to build Docker image')
        console.error(buildResult.stderr.toString())
        process.exit(1)
      }
      console.log('Docker image built successfully')
    }

    // Stop existing container if running
    await Bun.$`docker stop ${CONTAINER_NAME}`.quiet().nothrow()
    await Bun.$`docker rm ${CONTAINER_NAME}`.quiet().nothrow()

    console.log(`Starting runner on port ${port}...`)
    const runResult = await Bun.$`docker run -d \
      --name ${CONTAINER_NAME} \
      -p ${port}:3000 \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v ~/.tup-tup/runs:/app/runs \
      -e TUP_TUP_PORT=3000 \
      -e TUP_TUP_RUNS_PATH=/app/runs \
      ${IMAGE_NAME}`.quiet()

    if (runResult.exitCode !== 0) {
      console.error('Failed to start runner container')
      console.error(runResult.stderr.toString())
      process.exit(1)
    }

    console.log(`Runner started at http://localhost:${port}`)
  },
})
