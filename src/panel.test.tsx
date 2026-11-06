// `orca plugin test .` runs this in Node with the same runtime and checks Orca uses.
import { afterEach, assert, mockHost, mount, test, type TestPanel } from 'orca/testing'
import type { DbConnection } from './protocol'
import * as panelModule from './panel'

let panel: TestPanel | undefined
afterEach(() => panel?.unmount())

test('starts empty and saves a connection through the worker', async () => {
  const saved: DbConnection[] = []
  // Stands in for src/worker.ts: what each plugin.request answers.
  const host = mockHost({
    requests: {
      'connections.list': () => ({ connections: saved }),
      'connections.save': ({ connection }) => {
        saved.push(connection)
        return { connection }
      }
    }
  })
  panel = await mount(panelModule, { host })
  assert.ok(panel.find({ text: /No connections yet/ }))

  await panel.type({ label: 'Name' }, 'Local Postgres')
  await panel.type({ label: 'Database' }, 'app')
  await panel.type({ label: 'User' }, 'app')
  await panel.press({ text: 'Save' })

  assert.equal(saved.length, 1)
  assert.equal(saved[0]?.driver, 'postgres')
  assert.equal(saved[0]?.port, 5432)
  assert.ok(panel.find({ text: /Local Postgres/ }))
  assert.deepEqual(panel.errors, [])
  assert.deepEqual(panel.refusals, [])
})

test('refuses to save without a name', async () => {
  let saves = 0
  const host = mockHost({
    requests: {
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
