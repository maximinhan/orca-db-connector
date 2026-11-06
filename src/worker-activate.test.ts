// Runs activate(orca) against a hand-made `orca` object, so the wiring in src/worker.ts is checked
// in plain Node too (src/worker.test.ts does the same through orca/testing under `orca plugin test`).
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { OrcaWorkerApi } from 'orca/worker'
import activate, { deactivate, MCP_SERVER_PATH } from './worker.ts'

type Handler = (input: unknown, context: { panel: unknown; signal: AbortSignal }) => unknown
type HookHandler = (event: unknown, next: (event?: unknown) => unknown) => unknown

function fakeOrca(settings: Record<string, unknown> = {}) {
  const storage = new Map<string, unknown>()
  const secrets = new Map<string, string>()
  const handlers = new Map<string, Handler>()
  const hooks = new Map<string, HookHandler>()
  const posts: unknown[] = []
  const logs: string[] = []
  const disposable = { dispose() {} }
  const orca = {
    api: { major: 1, minor: 4 },
    commands: { register: () => disposable },
    events: { on: () => disposable },
    hooks: { on: (event: string, handler: HookHandler) => (hooks.set(event, handler), disposable) },
    host: { call: async () => ({}), has: () => false },
    panels: {
      handle: (name: string, handler: Handler) => (handlers.set(name, handler), disposable),
      post: (event: string, payload: unknown) => void posts.push({ event, payload })
    },
    storage: {
      get: async (key: string) => storage.get(key) ?? null,
      set: async (key: string, value: unknown) => void storage.set(key, value),
      delete: async (key: string) => void storage.delete(key),
      keys: async () => [...storage.keys()],
      onDidChange: () => disposable
    },
    settings: {
      get: async (key?: string) => (key === undefined ? settings : settings[key]),
      set: async () => undefined,
      onDidChange: () => disposable
    },
    secrets: {
      get: async (key: string) => secrets.get(key) ?? null,
      set: async (key: string, value: string) => void secrets.set(key, value),
      delete: async (key: string) => void secrets.delete(key)
    },
    grantedCapabilities: ['storage:own', 'secrets:own', 'settings:own'],
    log: (message: string) => void logs.push(message)
  }
  const request = (name: string, input: unknown = {}) => {
    const handler = handlers.get(name)
    assert.ok(handler, `no handler for ${name}`)
    return handler(input, { panel: null, signal: new AbortController().signal })
  }
  return { orca: orca as unknown as OrcaWorkerApi, request, hooks, posts, logs, secrets, storage }
}

test('activate wires panel requests, the gateway and the launch hook', async () => {
  const { orca, request, hooks, posts, logs, secrets } = fakeOrca({ agentAccess: 'read-only', maxRows: 2 })
  await activate(orca)
  try {
    const status = (await request('gateway.status')) as { running: boolean; url: string; mcpServerPath: string }
    assert.equal(status.running, true)
    assert.match(status.url, /^http:\/\/127\.0\.0\.1:\d+$/)
    assert.equal(status.mcpServerPath, MCP_SERVER_PATH)
    assert.ok(existsSync(MCP_SERVER_PATH), 'the MCP server file is where the worker says')

    const memory = { id: 'mem', name: 'Memory', driver: 'sqlite', host: '', port: 0, database: ':memory:', user: '', agent: true }
    await request('connections.save', { connection: memory, password: 'secret' })
    assert.equal(secrets.get('connection.mem.password'), 'secret')
    assert.deepEqual(posts, [{ event: 'connections.changed', payload: { count: 1 } }])

    const tested = (await request('connections.test', { id: 'mem' })) as { ok: boolean; message: string }
    assert.equal(tested.ok, true, tested.message)

    const rows = (await request('query.run', { id: 'mem', sql: 'SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3' })) as {
      rows: unknown[]
      truncated: boolean
    }
    assert.equal(rows.rows.length, 2)
    assert.equal(rows.truncated, true)

    await assert.rejects(request('query.run', { id: 'mem', sql: 'CREATE TABLE t (a)' }) as Promise<unknown>, /only read statements/)
    const created = (await request('query.run', { id: 'mem', sql: 'CREATE TABLE t (a)', allowWrites: true })) as { rowCount: number }
    assert.equal(created.rowCount, 0)

    // The hook decorates Claude Code launches and leaves the command of other agents alone.
    const hook = hooks.get('agent.launch.before')
    assert.ok(hook)
    const next = (event?: unknown) => ({ continued: event })
    const claude = hook({ agent: 'claude', command: 'claude', env: {} }, next) as { continued: { command: string; env: Record<string, string> } }
    assert.match(claude.continued.command, /^claude --mcp-config \S+mcp-\d+\.json$/)
    assert.equal(claude.continued.env.ORCA_DB_GATEWAY_URL, status.url)
    const configPath = claude.continued.command.replace(/^claude --mcp-config /, '').replace(/^"|"$/g, '')
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as { mcpServers: { 'orca-db': { args: string[] } } }
    assert.deepEqual(config.mcpServers['orca-db'].args, [MCP_SERVER_PATH])

    const codex = hook({ agent: 'codex', command: 'codex', env: { A: '1' } }, next) as { continued: { command: string; env: Record<string, string> } }
    assert.equal(codex.continued.command, 'codex')
    assert.equal(codex.continued.env.ORCA_DB_MCP_SERVER, MCP_SERVER_PATH)

    // The gateway answers with the same token the hook hands out.
    const health = await fetch(`${status.url}/health`, { headers: { authorization: `Bearer ${claude.continued.env.ORCA_DB_GATEWAY_TOKEN}` } })
    assert.equal(health.status, 200)
    assert.ok(logs.some((line) => line.includes('ready')))
  } finally {
    await deactivate()
  }
})

test('with agent access off the hook passes launches through unchanged', async () => {
  const { orca, hooks } = fakeOrca({ agentAccess: 'off' })
  await activate(orca)
  try {
    const hook = hooks.get('agent.launch.before')
    assert.ok(hook)
    let passed: unknown = 'not called'
    hook({ agent: 'claude', command: 'claude', env: {} }, (event?: unknown) => (passed = event))
    assert.equal(passed, undefined)
  } finally {
    await deactivate()
  }
})
