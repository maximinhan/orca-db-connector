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
  user: 'app'
}

test('saves a connection in storage and its password in secrets', async () => {
  const host = mockHost({})
  const worker = await mountWorker(main, { host })

  await worker.request('connections.save', { connection: local, password: 'hunter2' })

  assert.deepEqual(await worker.request('connections.list'), { connections: [local] })
  assert.deepEqual(host.data().storage, { connections: [local] })
  assert.equal(host.data().secrets['connection.local-pg.password'], 'hunter2')
  assert.deepEqual(worker.posts, [{ event: 'connections.changed', payload: { count: 1 } }])
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

  assert.deepEqual(host.data().storage, { connections: [] })
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

test('reports a missing driver instead of throwing on test', async () => {
  const worker = await mountWorker(main, { host: mockHost({ storage: { connections: [local] } }) })

  const result = await worker.request('connections.test', { id: 'local-pg' })

  assert.equal(result.ok, false)
  assert.match(result.message, /postgres driver/)
  await worker.deactivate()
})
