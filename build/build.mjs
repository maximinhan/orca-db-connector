// Builds ../vendor (see README.md):
//   pg.cjs       the `pg` PostgreSQL driver as one CommonJS file;
//   mysql2.cjs   the `mysql2/promise` MySQL driver as one CommonJS file.
// Also writes ../THIRD_PARTY_NOTICES.txt from the licences of every package in the bundles.
// Usage: npm ci --ignore-scripts && node build.mjs
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const HERE = import.meta.dirname
const PLUGIN = path.resolve(HERE, '..')
const VENDOR = path.join(PLUGIN, 'vendor')
const NOTICES = path.join(PLUGIN, 'THIRD_PARTY_NOTICES.txt')
// Why: the catalog refuses any plugin file over 1 MiB.
const MAX_FILE_BYTES = 1024 * 1024

const shims = {
  name: 'shims',
  setup(api) {
    api.onResolve({ filter: /^iconv-lite$/ }, () => ({ path: path.join(HERE, 'shims', 'iconv-lite.cjs') }))
    api.onResolve({ filter: /^aws-ssl-profiles$/ }, () => ({ path: path.join(HERE, 'shims', 'aws-ssl-profiles.cjs') }))
  }
}

const COMMON = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  // Readable output on purpose: the listing policy refuses code minified so it cannot be reviewed.
  minify: false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  absWorkingDir: HERE,
  // pg loads its optional native binding lazily; it is never bundled.
  external: ['pg-native'],
  plugins: [shims]
}

mkdirSync(VENDOR, { recursive: true })
const outputs = []
const packages = new Set()
for (const name of ['pg', 'mysql2']) {
  const outfile = path.join(VENDOR, `${name}.cjs`)
  const result = await build({
    ...COMMON,
    entryPoints: [path.join(HERE, 'entries', `${name}.cjs`)],
    outfile,
    banner: { js: `// Built from build/entries/${name}.cjs by build/build.mjs. Do not edit.` }
  })
  for (const input of Object.keys(result.metafile.inputs)) {
    const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(input)
    if (match) {
      packages.add(match[1])
    }
  }
  const text = readFileSync(outfile, 'utf8')
  if (/\beval\s*\(/.test(text)) {
    console.warn(`${path.relative(PLUGIN, outfile)} calls eval()`)
  }
  const size = Buffer.byteLength(text)
  if (size > MAX_FILE_BYTES) {
    throw new Error(`${path.relative(PLUGIN, outfile)} is ${size} bytes; the catalog takes at most ${MAX_FILE_BYTES}`)
  }
  outputs.push({ file: path.relative(PLUGIN, outfile), size })
}

// Notices: one licence block per bundled package, from its package.json and LICENSE file.
const blocks = []
for (const name of [...packages].sort()) {
  const dir = path.join(HERE, 'node_modules', name)
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const licenseFile = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'License', 'LICENCE'].map((file) => path.join(dir, file)).find(existsSync)
  const licenseText = licenseFile ? readFileSync(licenseFile, 'utf8').trim() : `(no licence file in the package; license field: ${pkg.license})`
  blocks.push(`${pkg.name}@${pkg.version} (${pkg.license ?? 'unknown'})\n${pkg.homepage ?? pkg.repository?.url ?? ''}\n\n${licenseText}`)
}
writeFileSync(
  NOTICES,
  `The DB Connector plugin bundles the following packages in vendor/ (built by build/build.mjs).\n\n` +
    blocks.join(`\n\n${'='.repeat(78)}\n\n`) +
    '\n'
)

for (const { file, size } of outputs) {
  console.log(`${file}: ${size} bytes`)
}
console.log(`THIRD_PARTY_NOTICES.txt: ${packages.size} packages`)
