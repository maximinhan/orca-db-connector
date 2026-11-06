import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApprovalQueue } from './queue.ts'

const input = { connectionId: 'c', connectionName: 'C', environment: 'prod', dangerous: true, agent: 'claude', sql: 'DELETE FROM t' }

test('approve and deny resolve the waiting request', async () => {
  const changes: number[] = []
  const queue = new ApprovalQueue({ timeoutMs: 10_000, onChange: (list) => changes.push(list.length) })
  const first = queue.request(input)
  const second = queue.request({ ...input, sql: 'UPDATE t SET a = 1' })
  const [a, b] = queue.list()
  assert.equal(queue.list().length, 2)
  assert.equal(a?.sql, 'DELETE FROM t')
  assert.ok(a && a.expiresAt - a.createdAt === 10_000)

  assert.equal(queue.decide(a!.id, true), true)
  assert.equal(queue.decide(b!.id, false), true)
  assert.equal(queue.decide(b!.id, false), false)
  assert.equal(await first, 'approved')
  assert.equal(await second, 'denied')
  assert.deepEqual(changes, [1, 2, 1, 0])
})

test('times out, and an aborted caller counts as denied', async () => {
  const queue = new ApprovalQueue({ timeoutMs: 20 })
  assert.equal(await queue.request(input), 'timeout')

  const controller = new AbortController()
  const pending = queue.request(input, controller.signal)
  controller.abort()
  assert.equal(await pending, 'denied')
  assert.equal(queue.list().length, 0)
})

test('dispose denies everything', async () => {
  const queue = new ApprovalQueue({ timeoutMs: 10_000 })
  const pending = queue.request(input)
  queue.dispose()
  assert.equal(await pending, 'denied')
})
