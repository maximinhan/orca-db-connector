// `orca plugin test .` runs this in Node with the same runtime and checks Orca uses.
import { afterEach, assert, mockHost, mount, test, type TestPanel } from 'orca/testing'
import type { ApprovalRequest, DbConnection, GatewayStatus } from './protocol'
import * as panelModule from './panel'

let panel: TestPanel | undefined
afterEach(() => panel?.unmount())

const gateway: GatewayStatus = {
  running: true,
  url: 'http://127.0.0.1:4321',
  agentAccess: 'read-only',
  mcpServerPath: '/plugins/db/mcp/orca-db-mcp.mjs',
  error: null
}

const quiet = {
  'gateway.status': () => gateway,
  'approvals.list': () => ({ approvals: [] }),
  'log.list': () => ({ entries: [] })
}

const local: DbConnection = {
  id: 'local',
  name: 'Local',
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

test('starts empty and saves a connection through the worker', async () => {
  const saved: DbConnection[] = []
  // Stands in for src/worker.ts: what each plugin.request answers.
  const host = mockHost({
    requests: {
      ...quiet,
      'connections.list': () => ({ connections: saved }),
      'connections.save': ({ connection }) => {
        saved.push(connection)
        return { connection }
      }
    }
  })
  panel = await mount(panelModule, { host })
  assert.ok(panel.find({ text: /No connections yet/ }))
  assert.ok(panel.find({ text: /Agent access/ }))

  await panel.type({ label: 'Name' }, 'Local Postgres')
  await panel.type({ label: 'Environment label' }, 'dev')
  await panel.type({ label: 'Database' }, 'app')
  await panel.type({ label: 'User' }, 'app')
  await panel.press({ text: 'Save' })

  assert.equal(saved.length, 1)
  assert.equal(saved[0]?.driver, 'postgres')
  assert.equal(saved[0]?.port, 5432)
  assert.equal(saved[0]?.environment, 'dev')
  assert.equal(saved[0]?.agent, true)
  assert.equal(saved[0]?.agentWrites, 'ask')
  assert.equal(saved[0]?.dangerous, false)
  assert.ok(panel.find({ text: /Local Postgres/ }))
  assert.deepEqual(panel.errors, [])
  assert.deepEqual(panel.refusals, [])
})

test('refuses to save without a name', async () => {
  let saves = 0
  const host = mockHost({
    requests: {
      ...quiet,
      'connections.list': () => ({ connections: [] }),
      'connections.save': ({ connection }) => {
        saves += 1
        return { connection }
      }
    }
  })
  panel = await mount(panelModule, { host })

  await panel.press({ text: 'Save' })

  assert.ok(panel.find({ text: /Give the connection a name/ }))
  assert.equal(saves, 0)
  assert.deepEqual(panel.errors, [])
})

test('runs a query on the selected connection and shows the rows', async () => {
  let lastSql = ''
  const host = mockHost({
    requests: {
      ...quiet,
      'connections.list': () => ({ connections: [local] }),
      'query.run': ({ sql }) => {
        lastSql = sql
        return { columns: ['n'], rows: [{ n: 1 }, { n: 2 }], rowCount: 2, truncated: false, durationMs: 3 }
      }
    }
  })
  panel = await mount(panelModule, { host, persisted: { plugin: { selectedId: 'local' } } })

  await panel.type({ label: 'SQL' }, 'SELECT n FROM t', { submit: true })

  assert.equal(lastSql, 'SELECT n FROM t')
  assert.ok(panel.find({ text: /2 row\(s\)/ }))
  assert.deepEqual(panel.errors, [])
})

test('a write on a dangerous connection asks for a second press', async () => {
  const runs: { allowWrites?: boolean; confirmed?: boolean }[] = []
  const prod: DbConnection = { ...local, id: 'prod', name: 'Prod', environment: 'prod', dangerous: true }
  const host = mockHost({
    requests: {
      ...quiet,
      'connections.list': () => ({ connections: [prod] }),
      'query.run': ({ allowWrites, confirmed }) => {
        runs.push({ allowWrites, confirmed })
        return { columns: [], rows: [], rowCount: 1, truncated: false, durationMs: 3, message: '1 row(s) changed' }
      }
    }
  })
  panel = await mount(panelModule, { host, persisted: { plugin: { selectedId: 'prod' } } })

  await panel.toggle({ label: 'Allow writes' })
  await panel.type({ label: 'SQL' }, 'DELETE FROM t', { submit: true })
  assert.equal(runs.length, 0)
  assert.ok(panel.find({ text: /dangerous environment/ }))

  await panel.press({ text: /Run on prod/ })
  assert.deepEqual(runs, [{ allowWrites: true, confirmed: true }])
  assert.ok(panel.find({ text: /1 row\(s\) changed/ }))
  assert.deepEqual(panel.errors, [])
})

test('shows an agent write waiting for approval and decides it', async () => {
  const request: ApprovalRequest = {
    id: 'apr-1',
    connectionId: 'local',
    connectionName: 'Local',
    environment: 'local',
    dangerous: false,
    agent: 'claude',
    sql: 'UPDATE t SET a = 1',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000
  }
  const decisions: { id: string; approve: boolean }[] = []
  const host = mockHost({
    requests: {
      ...quiet,
      'connections.list': () => ({ connections: [local] }),
      'approvals.list': () => ({ approvals: decisions.length === 0 ? [request] : [] }),
      'approvals.decide': ({ id, approve }) => {
        decisions.push({ id, approve })
        return { decided: true }
      }
    }
  })
  panel = await mount(panelModule, { host })
  assert.ok(panel.find({ text: /claude wants to write to Local/ }))

  await panel.press({ text: 'Approve' })

  assert.deepEqual(decisions, [{ id: 'apr-1', approve: true }])
  assert.equal(panel.find({ text: /claude wants to write/ }), undefined)
  assert.deepEqual(panel.errors, [])
})
