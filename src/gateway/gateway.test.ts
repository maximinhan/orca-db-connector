import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { ApprovalQueue } from '../approvals/queue.ts'
import { SecretsManager } from '../aws/secrets-manager.ts'
import { DbService, DEFAULT_SETTINGS } from '../db/service.ts'
import { sqliteDriver } from '../drivers/sqlite.ts'
import { QueryLog } from '../log/query-log.ts'
import type { AgentAccess, DbConnection } from '../protocol.ts'
import { startGateway, type Gateway } from './server.ts'

const dir = mkdtempSync(path.join(tmpdir(), 'orca-db-gateway-'))
const file = path.join(dir, 'a.db')
const sqlite = (id: string, extra: Partial<DbConnection>): DbConnection => ({
  id,
  name: id,
  driver: 'sqlite',
  host: '',
  port: 0,
  database: file,
  user: '',
  environment: 'test',
  agent: true,
  agentWrites: 'ask',
  dangerous: false, credentials: { source: 'password' },
  ...extra
})
const connections: DbConnection[] = [
  sqlite('local', {}),
  sqlite('hidden', { agent: false }),
  sqlite('auto', { agentWrites: 'always' }),
  sqlite('prod', { agentWrites: 'always', dangerous: true, credentials: { source: 'password' }, environment: 'prod' })
]
let access: AgentAccess = 'read-only'
let gateway: Gateway
const approvals = new ApprovalQueue({ timeoutMs: 2000 })
const log = new QueryLog()

const service = new DbService({
  getConnection: async (id) => connections.find((connection) => connection.id === id) ?? null,
  password: async () => null,
  settings: async () => ({ ...DEFAULT_SETTINGS, maxRows: 3, agentAccess: access }),
  approvals,
  log,
  secrets: new SecretsManager({ cli: null })
})

before(async () => {
  const client = await sqliteDriver.connect(connections[0]!, null, { readOnly: false, connectTimeoutMs: 1000, queryTimeoutMs: 1000 })
  await client.query('CREATE TABLE t (n INTEGER PRIMARY KEY)', { maxRows: 1 })
  await client.query('INSERT INTO t VALUES (1), (2), (3), (4), (5)', { maxRows: 1 })
  await client.close()
  gateway = await startGateway({
    service,
    listConnections: async () => connections,
    agentAccess: async () => access,
    version: '0.0.0-test'
  })
})

after(async () => {
  await gateway.close()
  rmSync(dir, { recursive: true, force: true })
})

async function call(method: string, route: string, body?: unknown, token = gateway.token, headers: Record<string, string> = {}) {
  const response = await fetch(`${gateway.url}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

test('refuses a wrong token', async () => {
  const { status } = await call('GET', '/health', undefined, 'nope')
  assert.equal(status, 401)
})

test('health, connections and schema', async () => {
  const health = await call('GET', '/health')
  assert.equal(health.status, 200)
  assert.deepEqual(health.body, { ok: true, version: '0.0.0-test', agentAccess: 'read-only' })

  const list = await call('GET', '/connections')
  assert.equal(list.status, 200)
  const listed = list.body.connections as { id: string; environment: string; dangerous: boolean; agentWrites: string }[]
  assert.deepEqual(listed.map((connection) => connection.id), ['local', 'auto', 'prod'])
  assert.deepEqual(listed[2], { id: 'prod', name: 'prod', driver: 'sqlite', host: '', port: 0, database: file, user: '', environment: 'prod', dangerous: true, agentWrites: 'always', credentialSource: 'password' })

  const schema = await call('GET', '/connections/local/schema')
  assert.equal(schema.status, 200)
  assert.deepEqual(schema.body, {
    tables: [{ schema: null, name: 't', kind: 'table', columns: [{ name: 'n', type: 'INTEGER', nullable: true, primaryKey: true }] }]
  })

  const hidden = await call('GET', '/connections/hidden/schema')
  assert.equal(hidden.status, 400)
})

test('runs reads, caps rows, logs the agent and refuses writes in read-only mode', async () => {
  const query = await call('POST', '/connections/local/query', { sql: 'SELECT n FROM t ORDER BY n', maxRows: 2 }, gateway.token, { 'x-orca-agent': 'codex' })
  assert.equal(query.status, 200)
  assert.deepEqual(query.body.rows, [{ n: 1 }, { n: 2 }])
  assert.equal(query.body.truncated, true)
  const logged = log.list()[0]
  assert.equal(logged?.agent, 'codex')
  assert.equal(logged?.source, 'agent')
  assert.equal(logged?.kind, 'read')
  assert.equal(logged?.status, 'ok')
  assert.deepEqual(log.result(logged!.id)?.rows, [{ n: 1 }, { n: 2 }])

  const capped = await call('POST', '/connections/local/query', { sql: 'SELECT n FROM t', maxRows: 100 })
  assert.equal((capped.body.rows as unknown[]).length, 3)

  const write = await call('POST', '/connections/auto/query', { sql: 'DELETE FROM t' })
  assert.equal(write.status, 403)
  assert.equal((write.body.error as { code: string }).code, 'not_permitted')
  assert.equal(log.list()[0]?.status, 'denied')

  const bad = await call('POST', '/connections/local/query', { sql: '' })
  assert.equal(bad.status, 400)

  const broken = await call('POST', '/connections/local/query', { sql: 'SELECT * FROM missing' })
  assert.equal(broken.status, 500)
  assert.match((broken.body.error as { message: string }).message, /no such table/)
  assert.equal(log.list()[0]?.status, 'error')
})

test('read-write mode: auto connections write at once inside a transaction', async () => {
  access = 'read-write'
  const write = await call('POST', '/connections/auto/query', { sql: 'DELETE FROM t WHERE n = 5' })
  assert.equal(write.status, 200)
  assert.equal(write.body.rowCount, 1)
  assert.equal(log.list()[0]?.approval, 'auto')

  // A failing write rolls back: the first statement's change must not stick.
  const failed = await call('POST', '/connections/auto/query', { sql: 'DELETE FROM t WHERE n = 4; INSERT INTO missing VALUES (1)' })
  assert.equal(failed.status, 500)
  const still = await call('POST', '/connections/auto/query', { sql: 'SELECT n FROM t WHERE n = 4' })
  assert.deepEqual(still.body.rows, [{ n: 4 }])
})

test('read-write mode: ask and dangerous connections wait for the panel', async () => {
  access = 'read-write'
  const pending = call('POST', '/connections/local/query', { sql: 'DELETE FROM t WHERE n = 4' }, gateway.token, { 'x-orca-agent': 'claude' })
  await new Promise((resolve) => setTimeout(resolve, 50))
  const waiting = approvals.list()
  assert.equal(waiting.length, 1)
  assert.equal(waiting[0]?.agent, 'claude')
  assert.equal(waiting[0]?.connectionId, 'local')
  approvals.decide(waiting[0]!.id, true)
  const approved = await pending
  assert.equal(approved.status, 200)
  assert.equal(approved.body.rowCount, 1)
  assert.equal(log.list()[0]?.approval, 'approved')

  const refused = call('POST', '/connections/prod/query', { sql: 'DELETE FROM t' })
  await new Promise((resolve) => setTimeout(resolve, 50))
  const dangerous = approvals.list()[0]
  assert.equal(dangerous?.dangerous, true)
  approvals.decide(dangerous!.id, false)
  const denied = await refused
  assert.equal(denied.status, 403)
  assert.match((denied.body.error as { message: string }).message, /refused/)
  assert.equal(log.list()[0]?.status, 'denied')
  assert.equal(log.list()[0]?.dangerous, true)
})

test('off refuses everything but health, unknown routes are 404', async () => {
  access = 'off'
  assert.equal((await call('GET', '/health')).body.agentAccess, 'off')
  assert.equal((await call('GET', '/connections')).status, 403)
  access = 'read-only'
  assert.equal((await call('GET', '/nope')).status, 404)
})
