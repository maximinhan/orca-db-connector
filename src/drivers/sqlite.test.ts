import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import type { DbConnection } from '../protocol.ts'
import { sqliteDriver } from './sqlite.ts'
import { toCell, uniqueColumns } from './values.ts'

const dir = mkdtempSync(path.join(tmpdir(), 'orca-db-sqlite-'))
const file = path.join(dir, 'test.db')
const connection: DbConnection = {
  id: 'sqlite-test',
  name: 'Test',
  driver: 'sqlite',
  host: '',
  port: 0,
  database: file,
  user: '',
  environment: '',
  agent: true,
  agentWrites: 'ask',
  dangerous: false
}
const options = { connectTimeoutMs: 1000, queryTimeoutMs: 1000 }

before(async () => {
  const client = await sqliteDriver.connect(connection, null, { ...options, readOnly: false })
  await client.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, bio BLOB)', { maxRows: 10 })
  await client.query("INSERT INTO users (name, bio) VALUES ('ann', x'0102'), ('bob', NULL), ('cy', NULL)", { maxRows: 10 })
  await client.query('CREATE VIEW names AS SELECT name FROM users', { maxRows: 10 })
  await client.close()
})

after(() => rmSync(dir, { recursive: true, force: true }))

test('reads rows, converts blobs and reports truncation', async () => {
  const client = await sqliteDriver.connect(connection, null, { ...options, readOnly: true })
  const result = await client.query('SELECT id, name, bio FROM users ORDER BY id', { maxRows: 2 })
  assert.deepEqual(result.columns, ['id', 'name', 'bio'])
  assert.deepEqual(result.rows, [
    { id: 1, name: 'ann', bio: '0x0102' },
    { id: 2, name: 'bob', bio: null }
  ])
  assert.equal(result.truncated, true)
  assert.equal(result.rowCount, 2)
  await client.close()
})

test('a read-only session refuses writes at the engine', async () => {
  const client = await sqliteDriver.connect(connection, null, { ...options, readOnly: true })
  await assert.rejects(client.query("INSERT INTO users (name) VALUES ('x')", { maxRows: 10 }), /readonly|read-only/i)
  await client.close()
})

test('a write session reports changed rows', async () => {
  const client = await sqliteDriver.connect(connection, null, { ...options, readOnly: false })
  const result = await client.query("UPDATE users SET name = 'cyd' WHERE name = 'cy'", { maxRows: 10 })
  assert.equal(result.rowCount, 1)
  assert.deepEqual(result.rows, [])
  assert.match(result.message ?? '', /1 row/)
  await client.close()
})

test('a transaction rolls back when a later statement fails', async () => {
  const client = await sqliteDriver.connect(connection, null, { ...options, readOnly: false })
  await assert.rejects(
    client.query("INSERT INTO users (name) VALUES ('tmp'); INSERT INTO nope VALUES (1)", { maxRows: 10, transaction: true }),
    /no such table/
  )
  const count = await client.query("SELECT COUNT(*) AS c FROM users WHERE name = 'tmp'", { maxRows: 1 })
  assert.deepEqual(count.rows, [{ c: 0 }])
  const ok = await client.query("INSERT INTO users (name) VALUES ('kept')", { maxRows: 10, transaction: true })
  assert.equal(ok.rowCount, 1)
  await client.close()
})

test('lists tables, views and columns', async () => {
  const client = await sqliteDriver.connect(connection, null, { ...options, readOnly: true })
  const tables = await client.listTables()
  assert.deepEqual(
    tables.map((table) => [table.name, table.kind, table.columns.map((column) => column.name)]),
    [
      ['names', 'view', ['name']],
      ['users', 'table', ['id', 'name', 'bio']]
    ]
  )
  const users = tables.find((table) => table.name === 'users')
  assert.deepEqual(users?.columns[0], { name: 'id', type: 'INTEGER', nullable: true, primaryKey: true })
  assert.deepEqual(users?.columns[1], { name: 'name', type: 'TEXT', nullable: false, primaryKey: false })
  await client.close()
})

test('cell and column helpers', () => {
  assert.equal(toCell(new Date('2026-01-02T03:04:05Z')), '2026-01-02T03:04:05.000Z')
  assert.equal(toCell(12n), 12)
  assert.equal(toCell(2n ** 60n), '1152921504606846976')
  assert.equal(toCell({ a: 1 }), '{"a":1}')
  assert.equal(toCell(undefined), null)
  assert.deepEqual(uniqueColumns(['a', 'a', '', 'a']), ['a', 'a_2', 'column', 'a_3'])
})
