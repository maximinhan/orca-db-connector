#!/usr/bin/env node
// Checks orca-plugin.json against Orca's published manifest v2 JSON Schema and that every file
// the manifest names exists. It is a quick pre-check that needs no Orca install; the real
// validator is `orca plugin validate .` (or `pnpm validate:plugin` from an Orca checkout).
//
// Usage: node scripts/check-manifest.mjs [--schema <path-or-url>]
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'

const root = path.resolve(import.meta.dirname, '..')
const manifestPath = path.join(root, 'orca-plugin.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const schemaFlag = process.argv.indexOf('--schema')
const schemaSource = schemaFlag === -1 ? manifest.$schema : process.argv[schemaFlag + 1]
if (typeof schemaSource !== 'string' || schemaSource === '') {
  console.error('No schema: add "$schema" to orca-plugin.json or pass --schema <path-or-url>.')
  process.exit(2)
}

async function loadSchema(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`${source}: HTTP ${response.status}`)
    }
    return response.json()
  }
  return JSON.parse(readFileSync(path.resolve(root, source), 'utf8'))
}

const problems = []

const schema = await loadSchema(schemaSource)
const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(schema)
if (!validate(manifest)) {
  for (const error of validate.errors ?? []) {
    problems.push(`schema: ${error.instancePath || '/'} ${error.message}`)
  }
}

// Files the manifest names must exist inside the plugin folder.
const named = [
  ['main', manifest.main],
  ['icon', manifest.icon],
  ['cover.path', manifest.cover?.path],
  ...(manifest.screenshots ?? []).map((shot, i) => [`screenshots[${i}].path`, shot.path]),
  ...(manifest.contributes?.panels ?? []).map((panel) => [`panels.${panel.id}.entry`, panel.entry]),
  ...(manifest.contributes?.customEditors ?? []).map((editor) => [`customEditors.${editor.id}.entry`, editor.entry]),
  ...(manifest.contributes?.themes ?? []).map((theme) => [`themes.${theme.id}.path`, theme.path]),
  ...(manifest.contributes?.syntaxes ?? []).map((syntax) => [`syntaxes.${syntax.id}.path`, syntax.path])
]
for (const [field, relative] of named) {
  if (typeof relative !== 'string') {
    continue
  }
  const file = path.join(root, ...relative.split('/'))
  if (!existsSync(file) || !statSync(file).isFile()) {
    problems.push(`${field}: ${relative} is not a file in the plugin folder`)
  }
}

// Rules the schema cannot express (from docs/reference/plugin-authoring.md).
if (typeof manifest.id === 'string' && manifest.id.startsWith('orca-')) {
  problems.push('id: the "orca-" prefix is reserved for official plugins')
}
if (typeof manifest.publisher === 'string') {
  problems.push('publisher: deprecated; Orca derives it from the repository owner, leave it out')
}
if (manifest.execution === 'trusted-worker' && typeof manifest.main !== 'string') {
  problems.push('main: a trusted-worker plugin must name its worker entry')
}
if (manifest.main && !existsSync(path.join(root, 'LICENSE'))) {
  problems.push('LICENSE: add a licence file matching the manifest "license" field')
}

if (problems.length > 0) {
  console.error(`orca-plugin.json: ${problems.length} problem(s)`)
  for (const problem of problems) {
    console.error(`  - ${problem}`)
  }
  process.exit(1)
}
console.log(`orca-plugin.json ok: ${manifest.id}@${manifest.version} (${manifest.execution}, engines.orca ${manifest.engines?.orca})`)
