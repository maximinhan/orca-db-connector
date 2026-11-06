// Runs activate(orca) against a hand-made `orca` object, so the wiring in src/worker.ts is checked
// in plain Node too (src/worker.test.ts does the same through orca/testing under `orca plugin test`).
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { OrcaWorkerApi } from 'orca/worker'
import type { ApprovalRequest, QueryLogEntry } from './protocol.ts'
import activate, { deactivate, MCP_SERVER_PATH } from './worker.ts'

type Handler = (input: unknown, context: { panel: unknown; signal: AbortSignal }) => unknown
type HookHandler = (event: unknown, next: (event?: unknown) => unknown) => unknown

function fakeOrca(settings: Record<string, unknown> = {}) {
  const storage = new Map<string, unknown>()
  const secrets = new Map<string, string>()
  const handlers = new Map<string, Handler>()
  const hooks = new Map<string, HookHandler>()
  const posts: { event: string; payload: unknown }[] = []
  const hostCalls: { method: string; params: unknown }[] = []
  const logs: string[] = []
  const disposable = { dispose() {} }
  const orca = {
    api: { major: 1, minor: 4 },
    commands: { register: () => disposable },
    events: { on: () => disposable },
    hooks: { on: (event: string, handler: HookHandler) => (hooks.set(event, handler), disposable) },
    host: { call: async (method: string, params: unknown) => (hostCalls.push({ method, params }), { delivered: true }), has: () => false },
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
    grantedCapabilities: ['storage:own', 'secrets:own', 'settings:own', 'notifications:show'],
    log: (message: string) => void logs.push(message)
  }
  const request = <T = unknown>(name: string, input: unknown = {}): Promise<T> => {
    const handler = handlers.get(name)
    assert.ok(handler, `no handler for ${name}`)
    return Promise.resolve(handler(input, { panel: null, signal: new AbortController().signal }) as T)
  }
  return { orca: orca as unknown as OrcaWorkerApi, request, hooks, posts, hostCalls, logs, secrets, storage }
}

const memory = {
  id: 'mem',
  name: 'Memory',
  driver: 'sqlite',
  host: '',
  port: 0,
  database: ':memory:',
  user: '',
  environment: 'local',
  agent: true,
  agentWrites: 'ask',
  dangerous: false
}

test('activate wires panel requests, the gateway and the launch hook', async () => {
  const { orca, request, hooks, posts, logs, secrets, storage } = fakeOrca({ agentAccess: 'read-only', maxRows: 2 })
  await activate(orca)
  try {
    const status = await request<{ running: boolean; url: string; mcpServerPath: string }>('gateway.status')
    assert.equal(status.running, true)
    assert.match(status.url, /^http:\/\/127\.0\.0\.1:\d+$/)
    assert.equal(status.mcpServerPath, MCP_SERVER_PATH)
    assert.ok(existsSync(MCP_SERVER_PATH), 'the MCP server file is where the worker says')

    await request('connections.save', { connection: memory, password: 'secret' })
    assert.equal(secrets.get('connection.mem.password'), 'secret')
    assert.deepEqual(posts[0], { event: 'connections.changed', payload: { count: 1 } })

    const tested = await request<{ ok: boolean; message: string }>('connections.test', { id: 'mem' })
    assert.equal(tested.ok, true, tested.message)

    const rows = await request<{ rows: unknown[]; truncated: boolean }>('query.run', {
      id: 'mem',
      sql: 'SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3'
    })
    assert.equal(rows.rows.length, 2)
    assert.equal(rows.truncated, true)

    await assert.rejects(request('query.run', { id: 'mem', sql: 'CREATE TABLE t (a)' }), /Allow writes/)
    const created = await request<{ rowCount: number }>('query.run', { id: 'mem', sql: 'CREATE TABLE t (a)', allowWrites: true })
    assert.equal(created.rowCount, 0)

    // The log has the read, the refused write and the write, newest first, and keeps the rows.
    const { entries } = await request<{ entries: QueryLogEntry[] }>('log.list')
    assert.deepEqual(entries.map((entry) => [entry.source, entry.kind, entry.status]), [
      ['panel', 'write', 'ok'],
      ['panel', 'write', 'denied'],
      ['panel', 'read', 'ok']
    ])
    const { result } = await request<{ result: { rows: unknown[] } | null }>('log.result', { id: entries[2]!.id })
    assert.equal(result?.rows.length, 2)
    assert.ok(posts.some((post) => post.event === 'log.changed'))
    assert.ok(Array.isArray(storage.get('queryLog')) || true) // persisted asynchronously; flushed on deactivate

    // The hook decorates Claude Code launches and leaves the command of other agents alone.
    const hook = hooks.get('agent.launch.before')
    assert.ok(hook)
    const next = (event?: unknown) => ({ continued: event })
    const claude = hook({ agent: 'claude', command: 'claude', env: {} }, next) as { continued: { command: string; env: Record<string, string> } }
    assert.match(claude.continued.command, /^claude --mcp-config \S+mcp-\d+\.json$/)
    assert.equal(claude.continued.env.ORCA_DB_GATEWAY_URL, status.url)
    assert.equal(claude.continued.env.ORCA_DB_AGENT, 'claude')
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
  assert.equal((storage.get('queryLog') as unknown[]).length, 3)
})

test('an agent write waits for the panel, notifies, and the decision reaches the agent', async () => {
  const { orca, request, hooks, posts, hostCalls } = fakeOrca({ agentAccess: 'read-write', approvalTimeoutMs: 10_000 })
  await activate(orca)
  try {
    await request('connections.save', { connection: { ...memory, dangerous: true, environment: 'prod' } })
    const hook = hooks.get('agent.launch.before')!
    const launch = hook({ agent: 'claude', command: 'claude', env: {} }, (event?: unknown) => ({ continued: event })) as { continued: { env: Record<string, string> } }
    const { ORCA_DB_GATEWAY_URL: url, ORCA_DB_GATEWAY_TOKEN: token } = launch.continued.env

    const pending = fetch(`${url}/connections/mem/query`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-orca-agent': 'claude' },
      body: JSON.stringify({ sql: 'CREATE TABLE t (a)' })
    })
    await new Promise((resolve) => setTimeout(resolve, 80))

    const { approvals } = await request<{ approvals: ApprovalRequest[] }>('approvals.list')
    assert.equal(approvals.length, 1)
    assert.equal(approvals[0]?.dangerous, true)
    assert.equal(approvals[0]?.agent, 'claude')
    assert.ok(posts.some((post) => post.event === 'approvals.changed'))
    const notification = hostCalls.find((call) => call.method === 'notifications.show')
    assert.match((notification?.params as { title: string }).title, /claude wants to write to Memory \(prod\)/)

    assert.deepEqual(await request('approvals.decide', { id: approvals[0]!.id, approve: true }), { decided: true })
    const response = await pending
    assert.equal(response.status, 200)
    const { entries } = await request<{ entries: QueryLogEntry[] }>('log.list')
    assert.equal(entries[0]?.approval, 'approved')
    assert.equal(entries[0]?.agent, 'claude')
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
