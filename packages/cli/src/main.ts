#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'

import start from './commands/start'
import stop from './commands/stop'
import run from './commands/run'
import list from './commands/list'
import status from './commands/status'
import logs from './commands/logs'

const main = defineCommand({
  meta: {
    name: 'tup-tup',
    version: '0.1.0',
    description: 'CLI for tup-tup CI/CD pipeline runner',
  },
  subCommands: {
    start,
    stop,
    run,
    list,
    status,
    logs,
  },
})

runMain(main)
