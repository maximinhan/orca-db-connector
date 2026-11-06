import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LOG_KEY, QueryLog, type QueryLogInput } from './query-log.ts'

const base: QueryLogInput = {
  source: 'agent',
  agent: 'claude',
  connectionId: 'c',
  connectionName: 'C',
  environment: 'dev',
  dangerous: false,
  sql: 'SELECT 1',
  kind: 'read',
  status: 'ok',
  approval: null,
  rowCount: 1,
  durationMs: 2,
  error: null
}
const result = { columns: ['n'], rows: [{ n: 1 }], rowCount: 1, truncated: false, durationMs: 2 }

test('keeps entries newest first, rows for the latest, and persists without rows', async () => {
  const stored = new Map<string, unknown>()
  const store = { get: async (key: string) => stored.get(key) ?? null, set: async (key: string, value: unknown) => void stored.set(key, value) }
  const log = new QueryLog({ store })
  await log.load()

  const first = log.append(base, result)
  const second = log.append({ ...base, sql: 'SELECT 2', status: 'error', error: 'boom' }, null)
  assert.deepEqual(log.list().map((entry) => entry.sql), ['SELECT 2', 'SELECT 1'])
  assert.equal(first.hasResult, true)
  assert.equal(second.hasResult, false)
  assert.deepEqual(log.result(first.id), result)
  assert.equal(log.result(second.id), null)

  await log.flush()
  const persisted = stored.get(LOG_KEY) as { id: string; hasResult: boolean }[]
  assert.equal(persisted.length, 2)
  assert.equal(persisted.every((entry) => entry.hasResult === false), true)

  const reloaded = new QueryLog({ store })
  await reloaded.load()
  assert.equal(reloaded.list().length, 2)
  assert.equal(reloaded.result(first.id), null)

  assert.equal(log.clear(), 2)
  assert.deepEqual(log.list(), [])
  await log.flush()
  assert.deepEqual(stored.get(LOG_KEY), [])
})

test('cuts long sql and drops the oldest rows past the cap', () => {
  const log = new QueryLog()
  const long = log.append({ ...base, sql: 'x'.repeat(5000) }, null)
  assert.equal(long.sql.length, 4001)
  const ids: string[] = []
  for (let i = 0; i < 55; i += 1) {
    ids.push(log.append(base, result).id)
  }
  assert.equal(log.result(ids[0]!), null)
  assert.equal(log.list().find((entry) => entry.id === ids[0])?.hasResult, false)
  assert.deepEqual(log.result(ids[54]!), result)
})
