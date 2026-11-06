// `orca plugin test .` runs this in Node with the same runtime and checks Orca uses.
import { afterEach, assert, mockHost, mount, test, type TestPanel } from 'orca/testing'
import type { DbConnection, GatewayStatus } from './protocol'
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

test('starts empty and saves a connection through the worker', async () => {
  const saved: DbConnection[] = []
  // Stands in for src/worker.ts: what each plugin.request answers.
  const host = mockHost({
    requests: {
      'connections.list': () => ({ connections: saved }),
      'gateway.status': () => gateway,
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
  await panel.type({ label: 'Database' }, 'app')
  await panel.type({ label: 'User' }, 'app')
  await panel.press({ text: 'Save' })

  assert.equal(saved.length, 1)
  assert.equal(saved[0]?.driver, 'postgres')
  assert.equal(saved[0]?.port, 5432)
  assert.equal(saved[0]?.agent, true)
  assert.ok(panel.find({ text: /Local Postgres/ }))
  assert.deepEqual(panel.errors, [])
  assert.deepEqual(panel.refusals, [])
})

test('refuses to save without a name', async () => {
  let saves = 0
  const host = mockHost({
    requests: {
      'connections.list': () => ({ connections: [] }),
      'gateway.status': () => gateway,
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
  const local: DbConnection = {
    id: 'local',
    name: 'Local',
    driver: 'sqlite',
    host: '',
    port: 0,
    database: ':memory:',
    user: '',
    agent: true
  }
  let lastSql = ''
  const host = mockHost({
    requests: {
      'connections.list': () => ({ connections: [local] }),
      'gateway.status': () => gateway,
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
