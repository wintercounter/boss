#!/usr/bin/env node

import { intro } from '@clack/prompts'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

import { loadConfig } from '@/api/config'
import { runTask } from '@/cli/utils'
import type { Config } from '@/cli/types'

intro('boss')
;(async () => {
    const argv = yargs(hideBin(process.argv))
        .parserConfiguration({
            'camel-case-expansion': true,
            'dot-notation': false,
            'populate--': true,
        })
        .option('yes', { alias: 'y', type: 'boolean' })
        .option('globals', { type: 'boolean' })
        .option('eslint-plugin', { type: 'boolean' })
        .option('port', { type: 'number' })
        .option('max-port', { type: 'number' })
        .help(false)
        .version(false)
        .parseSync()
    const userConfig = await loadConfig()

    await runTask({
        argv,
        runtimeType: process.title as Config['runtimeType'],
        procedures: [],
        userConfig,
    })
})()
