import { Command } from 'commander'

import { resolveTargets } from './targets'
import type { BuildArgs } from './types'

const DEFAULT_MANIFEST_PATH = 'scripts/build/config/server-prod-resources.json'

export function parseBuildArgs(argv: string[]): BuildArgs {
  const program = new Command()
  program
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .exitOverride((error) => {
      throw new Error(error.message)
    })
    .option('--target <targets>', 'Build target ids or "all"', 'all')
    .option(
      '--manifest <path>',
      'Resource manifest path',
      DEFAULT_MANIFEST_PATH,
    )
    .option('--upload', 'Upload artifact zips to R2')
    .option('--no-upload', 'Skip zip upload to R2')
    .option(
      '--compile-only',
      'Compile binaries only (skip R2 staging and upload)',
    )
    .option(
      '--archive-compiled',
      'Archive compile-only binaries into local zip files without R2 resources',
    )
  program.parse(argv, { from: 'user' })
  const options = program.opts<{
    target: string
    manifest: string
    upload: boolean
    compileOnly: boolean
    archiveCompiled: boolean
  }>()

  const compileOnly = options.compileOnly ?? false
  const archiveCompiled = options.archiveCompiled ?? false
  if (archiveCompiled && !compileOnly) {
    throw new Error('--archive-compiled requires --compile-only')
  }

  return {
    targets: resolveTargets(options.target),
    manifestPath: options.manifest,
    upload: compileOnly ? false : (options.upload ?? true),
    compileOnly,
    archiveCompiled,
  }
}
