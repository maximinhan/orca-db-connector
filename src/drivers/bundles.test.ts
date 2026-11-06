// The bundled drivers load and fail cleanly against a closed port; real servers are not needed.
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { test } from 'node:test'
import type { DbConnection } from '../protocol.ts'
import { loadDriver } from './index.ts'

async function closedPort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

const options = { readOnly: true, connectTimeoutMs: 2000, queryTimeoutMs: 2000 }

test('postgres bundle loads and reports a refused connection', async () => {
  const driver = await loadDriver('postgres')
  assert.equal(driver.label, 'PostgreSQL')
  const connection: DbConnection = { id: 'pg', name: 'pg', driver: 'postgres', host: '127.0.0.1', port: await closedPort(), database: 'x', user: 'u', environment: '', agent: true, agentWrites: 'ask', dangerous: false, credentials: { source: 'password' } }
  await assert.rejects(driver.connect(connection, 'p', options), /ECONNREFUSED|connect/i)
})

test('mysql bundle loads and reports a refused connection', async () => {
  const driver = await loadDriver('mysql')
  assert.equal(driver.label, 'MySQL / MariaDB')
  const connection: DbConnection = { id: 'my', name: 'my', driver: 'mysql', host: '127.0.0.1', port: await closedPort(), database: 'x', user: 'u', environment: '', agent: true, agentWrites: 'ask', dangerous: false, credentials: { source: 'password' } }
  await assert.rejects(driver.connect(connection, 'p', options), /ECONNREFUSED|connect/i)
})

test('sqlite loads through the registry too', async () => {
  const driver = await loadDriver('sqlite')
  assert.equal(driver.kind, 'sqlite')
  assert.equal(await loadDriver('sqlite'), driver)
})
