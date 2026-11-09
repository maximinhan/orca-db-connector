import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { claudeMcpAddCommand, findClaudeCli, registerClaudeMcpServer } from './claude-setup.ts'

test('prints the command to run by hand', () => {
  assert.equal(
    claudeMcpAddCommand({ mcpServerPath: '/Users/me/My Plugins/db/mcp/orca-db-mcp.mjs', execPath: '/usr/local/bin/node' }),
    'claude mcp add --scope user --env ELECTRON_RUN_AS_NODE=1 orca-db -- /usr/local/bin/node "/Users/me/My Plugins/db/mcp/orca-db-mcp.mjs"'
  )
})

test('runs the claude CLI when found, and explains when it is not', async () => {
  const bin = mkdtempSync(path.join(tmpdir(), 'orca-db-claude-'))
  const home = mkdtempSync(path.join(tmpdir(), 'orca-db-home-'))
  try {
    const cli = path.join(bin, 'claude')
    writeFileSync(cli, `#!/bin/sh\necho "$@" > "${path.join(bin, 'args')}"\necho "Added stdio MCP server orca-db"\n`)
    chmodSync(cli, 0o755)
    const env = { PATH: bin }

    assert.equal(findClaudeCli(env, home), cli)
    const result = await registerClaudeMcpServer({ mcpServerPath: '/p/mcp.mjs', execPath: '/n/node', env, home })
    assert.equal(result.ok, true)
    assert.match(result.message, /Added stdio MCP server orca-db/)
    assert.equal(readFileSync(path.join(bin, 'args'), 'utf8').trim(), 'mcp add --scope user --env ELECTRON_RUN_AS_NODE=1 orca-db -- /n/node /p/mcp.mjs')

    writeFileSync(cli, `#!/bin/sh\necho "MCP server orca-db already exists in user config" >&2\nexit 1\n`)
    const again = await registerClaudeMcpServer({ mcpServerPath: '/p/mcp.mjs', execPath: '/n/node', env, home })
    assert.equal(again.ok, true)
    assert.match(again.message, /already registered/)

    const missing = await registerClaudeMcpServer({ mcpServerPath: '/p/mcp.mjs', execPath: '/n/node', env: { PATH: '/nonexistent' }, home })
    assert.equal(missing.ok, false)
    assert.match(missing.message, /not found/)
    assert.match(missing.command, /^claude mcp add --scope user/)
  } finally {
    rmSync(bin, { recursive: true, force: true })
    rmSync(home, { recursive: true, force: true })
  }
})
