#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'

import list from './commands/list'
import logs from './commands/logs'
import run from './commands/run'
import start from './commands/start'
import status from './commands/status'
import stop from './commands/stop'
import tail from './commands/tail'

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
    tail,
  },
})

runMain(main)
