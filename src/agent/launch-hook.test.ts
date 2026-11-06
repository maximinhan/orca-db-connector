import assert from 'node:assert/strict'
import { test } from 'node:test'
import { claudeMcpConfig, decorateAgentLaunch, isClaudeCodeAgent } from './launch-hook.ts'

const deps = {
  gatewayUrl: 'http://127.0.0.1:4321',
  token: 'tok',
  mcpServerPath: '/plugins/db/mcp/orca-db-mcp.mjs',
  claudeMcpConfigPath: '/tmp/orca db/mcp.json'
}

test('adds env to every agent and --mcp-config only to Claude Code', () => {
  const claude = decorateAgentLaunch({ agent: 'claude', command: 'claude --resume', env: { A: '1' } }, deps)
  assert.equal(claude.command, 'claude --resume --mcp-config "/tmp/orca db/mcp.json"')
  assert.deepEqual(claude.env, {
    A: '1',
    ORCA_DB_GATEWAY_URL: 'http://127.0.0.1:4321',
    ORCA_DB_GATEWAY_TOKEN: 'tok',
    ORCA_DB_MCP_SERVER: '/plugins/db/mcp/orca-db-mcp.mjs',
    ORCA_DB_AGENT: 'claude'
  })

  const codex = decorateAgentLaunch({ agent: 'codex', command: 'codex', env: {} }, deps)
  assert.equal(codex.command, 'codex')
  assert.equal(codex.env.ORCA_DB_GATEWAY_TOKEN, 'tok')
  assert.equal(codex.env.ORCA_DB_AGENT, 'codex')
})

test('keeps an --mcp-config the person already passed, and other fields', () => {
  const event = { agent: 'claude', command: 'claude --mcp-config mine.json', env: {}, workspaceId: 'w1' }
  const decorated = decorateAgentLaunch(event, deps)
  assert.equal(decorated.command, event.command)
  assert.equal(decorated.workspaceId, 'w1')

  const noConfig = decorateAgentLaunch({ agent: 'claude', command: 'claude', env: {} }, { ...deps, claudeMcpConfigPath: null })
  assert.equal(noConfig.command, 'claude')
})

test('mcp config names the server and its env', () => {
  assert.deepEqual(claudeMcpConfig(deps, '/usr/bin/node'), {
    mcpServers: {
      'orca-db': {
        command: '/usr/bin/node',
        args: ['/plugins/db/mcp/orca-db-mcp.mjs'],
        env: { ELECTRON_RUN_AS_NODE: '1', ORCA_DB_GATEWAY_URL: 'http://127.0.0.1:4321', ORCA_DB_GATEWAY_TOKEN: 'tok', ORCA_DB_AGENT: 'claude' }
      }
    }
  })
  assert.equal(isClaudeCodeAgent('claude-agent-teams'), true)
  assert.equal(isClaudeCodeAgent('gemini'), false)
})
