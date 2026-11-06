// Runs src/worker.ts's activate(orca) with the orca object Orca passes, over a mock host.
import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'
import type { DbConnection } from './protocol'

const local: DbConnection = {
  id: 'local-pg',
  name: 'Local Postgres',
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'app',
  user: 'app',
  environment: 'local',
  agent: true,
  agentWrites: 'ask',
  dangerous: false
}

const memory: DbConnection = {
  id: 'memory',
  name: 'In-memory SQLite',
  driver: 'sqlite',
  host: '',
  port: 0,
  database: ':memory:',
  user: '',
  environment: '',
  agent: true,
  agentWrites: 'ask',
  dangerous: false
}

test('saves a connection in storage and its password in secrets', async () => {
  const host = mockHost({})
  const worker = await mountWorker(main, { host })

  await worker.request('connections.save', { connection: local, password: 'hunter2' })

  assert.deepEqual(await worker.request('connections.list'), { connections: [local] })
  assert.deepEqual(host.data().storage.connections, [local])
  assert.equal(host.data().secrets['connection.local-pg.password'], 'hunter2')
  assert.ok(worker.posts.some((post) => post.event === 'connections.changed' && (post.payload as { count: number }).count === 1))
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('removing a connection also drops its password', async () => {
  const host = mockHost({
    storage: { connections: [local] },
    secrets: { 'connection.local-pg.password': 'hunter2' }
  })
  const worker = await mountWorker(main, { host })

  assert.deepEqual(await worker.request('connections.remove', { id: 'local-pg' }), { removed: true })
  assert.deepEqual(await worker.request('connections.remove', { id: 'local-pg' }), { removed: false })

  assert.deepEqual(host.data().storage.connections, [])
  assert.equal(host.data().secrets['connection.local-pg.password'], undefined)
  await worker.deactivate()
})

test('refuses an invalid connection', async () => {
  const worker = await mountWorker(main)

  await assert.rejects(
    worker.request('connections.save', { connection: { ...local, port: 70000 } }),
    (error: unknown) => error instanceof Error && /65535/.test(error.message)
  )
  await worker.deactivate()
})

test('tests, lists the schema of, queries and logs an in-memory SQLite connection', async () => {
  const worker = await mountWorker(main, { host: mockHost({ storage: { connections: [memory] } }) })

  const tested = await worker.request('connections.test', { id: 'memory' })
  assert.equal(tested.ok, true)

  const rows = await worker.request('query.run', { id: 'memory', sql: 'SELECT 1 AS n, 2 AS m' })
  assert.deepEqual(rows.columns, ['n', 'm'])
  assert.deepEqual(rows.rows, [{ n: 1, m: 2 }])

  await assert.rejects(
    worker.request('query.run', { id: 'memory', sql: 'CREATE TABLE t (a)' }),
    (error: unknown) => error instanceof Error && /Allow writes/.test(error.message)
  )
  const { entries } = await worker.request('log.list')
  assert.deepEqual(entries.map((entry) => [entry.kind, entry.status]), [
    ['write', 'denied'],
    ['read', 'ok']
  ])
  assert.deepEqual((await worker.request('log.result', { id: entries[1]!.id })).result?.rows, [{ n: 1, m: 2 }])
  assert.deepEqual(await worker.request('log.clear'), { cleared: 2 })
  await worker.deactivate()
})

test('starts the agent gateway and decorates agent launches', async () => {
  const worker = await mountWorker(main)

  const status = await worker.request('gateway.status')
  assert.equal(status.running, true)
  assert.match(status.url ?? '', /^http:\/\/127\.0\.0\.1:\d+$/)
  assert.equal(status.agentAccess, 'read-only')

  const decided = await worker.hooks.fire('agent.launch.before', {
    agent: 'claude',
    workspaceId: null,
    workspaceKind: null,
    command: 'claude',
    env: {}
  })
  assert.equal(decided.decision, 'continue')
  const launch = decided.payload as { command: string; env: Record<string, string> }
  assert.match(launch.command, /^claude --mcp-config /)
  assert.equal(launch.env.ORCA_DB_GATEWAY_URL, status.url)
  assert.equal(launch.env.ORCA_DB_AGENT, 'claude')
  assert.ok(launch.env.ORCA_DB_GATEWAY_TOKEN)

  await worker.deactivate()
})
