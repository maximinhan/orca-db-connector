import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { DbService, DEFAULT_SETTINGS } from '../db/service.ts'
import { sqliteDriver } from '../drivers/sqlite.ts'
import type { AgentAccess, DbConnection } from '../protocol.ts'
import { startGateway, type Gateway } from './server.ts'

const dir = mkdtempSync(path.join(tmpdir(), 'orca-db-gateway-'))
const connections: DbConnection[] = [
  { id: 'local', name: 'Local', driver: 'sqlite', host: '', port: 0, database: path.join(dir, 'a.db'), user: '', agent: true },
  { id: 'hidden', name: 'Hidden', driver: 'sqlite', host: '', port: 0, database: path.join(dir, 'a.db'), user: '', agent: false }
]
let access: AgentAccess = 'read-only'
let gateway: Gateway

const service = new DbService({
  getConnection: async (id) => connections.find((connection) => connection.id === id) ?? null,
  password: async () => null,
  settings: async () => ({ ...DEFAULT_SETTINGS, maxRows: 3 })
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

async function call(method: string, route: string, body?: unknown, token = gateway.token) {
  const response = await fetch(`${gateway.url}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
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
  assert.deepEqual(list.body, {
    connections: [{ id: 'local', name: 'Local', driver: 'sqlite', host: '', port: 0, database: path.join(dir, 'a.db'), user: '' }]
  })

  const schema = await call('GET', '/connections/local/schema')
  assert.equal(schema.status, 200)
  assert.deepEqual(schema.body, {
    tables: [{ schema: null, name: 't', kind: 'table', columns: [{ name: 'n', type: 'INTEGER', nullable: true, primaryKey: true }] }]
  })

  const hidden = await call('GET', '/connections/hidden/schema')
  assert.equal(hidden.status, 400)
})

test('runs reads, caps rows and refuses writes in read-only mode', async () => {
  const query = await call('POST', '/connections/local/query', { sql: 'SELECT n FROM t ORDER BY n', maxRows: 2 })
  assert.equal(query.status, 200)
  assert.deepEqual(query.body.rows, [{ n: 1 }, { n: 2 }])
  assert.equal(query.body.truncated, true)

  const capped = await call('POST', '/connections/local/query', { sql: 'SELECT n FROM t', maxRows: 100 })
  assert.equal((capped.body.rows as unknown[]).length, 3)

  const write = await call('POST', '/connections/local/query', { sql: 'DELETE FROM t' })
  assert.equal(write.status, 403)
  assert.equal((write.body.error as { code: string }).code, 'not_permitted')

  const bad = await call('POST', '/connections/local/query', { sql: '' })
  assert.equal(bad.status, 400)

  const broken = await call('POST', '/connections/local/query', { sql: 'SELECT * FROM missing' })
  assert.equal(broken.status, 500)
  assert.match((broken.body.error as { message: string }).message, /no such table/)
})

test('read-write mode allows writes and off refuses everything but health', async () => {
  access = 'read-write'
  const write = await call('POST', '/connections/local/query', { sql: 'DELETE FROM t WHERE n = 5' })
  assert.equal(write.status, 200)
  assert.equal(write.body.rowCount, 1)

  access = 'off'
  assert.equal((await call('GET', '/health')).body.agentAccess, 'off')
  assert.equal((await call('GET', '/connections')).status, 403)
  access = 'read-only'
})

test('unknown routes are 404', async () => {
  assert.equal((await call('GET', '/nope')).status, 404)
})
