import { defineCommand } from 'citty'
import { CONTAINER_NAME } from '../config'

export default defineCommand({
  meta: {
    name: 'stop',
    description: 'Stop and remove the tup-tup runner container',
  },
  async run() {
    console.log('Stopping runner...')

    const stopResult = await Bun.$`docker stop ${CONTAINER_NAME}`.quiet().nothrow()
    if (stopResult.exitCode !== 0) {
      console.log('Container not running or already stopped')
    } else {
      console.log('Container stopped')
    }

    const rmResult = await Bun.$`docker rm ${CONTAINER_NAME}`.quiet().nothrow()
    if (rmResult.exitCode !== 0) {
      console.log('Container already removed')
    } else {
      console.log('Container removed')
    }

    console.log('Runner stopped')
  },
})
