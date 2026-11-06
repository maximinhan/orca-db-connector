// DbService with AWS-sourced credentials: the secret fills blank fields and is re-read once when
// a cached value stops working.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { ApprovalQueue } from '../approvals/queue.ts'
import { SecretsManager, type DatabaseSecret } from '../aws/secrets-manager.ts'
import { sqliteDriver } from '../drivers/sqlite.ts'
import { QueryLog } from '../log/query-log.ts'
import type { DbConnection } from '../protocol.ts'
import { DbService, DEFAULT_SETTINGS } from './service.ts'

const dir = mkdtempSync(path.join(tmpdir(), 'orca-db-service-'))
const file = path.join(dir, 'secret.db')

// A stand-in SecretsManager: answers from a script so no AWS call is made.
class FakeSecrets extends SecretsManager {
  calls: { fresh: boolean }[] = []
  answers: DatabaseSecret[] = []
  override async get(_ref: unknown, { fresh = false }: { fresh?: boolean } = {}): Promise<DatabaseSecret> {
    this.calls.push({ fresh })
    const next = this.answers.shift()
    if (next === undefined) {
      throw new Error('no more answers')
    }
    return next
  }
}

const secret = (database: string): DatabaseSecret => ({ password: null, username: 'app', host: 'ignored', port: 5432, database, engine: 'sqlite', raw: {} })

const awsConnection: DbConnection = {
  id: 'aws',
  name: 'From AWS',
  driver: 'sqlite',
  host: '',
  port: 0,
  database: '',
  user: '',
  environment: 'staging',
  agent: true,
  agentWrites: 'ask',
  dangerous: false,
  credentials: { source: 'aws-secrets-manager', secretId: 'staging/db', region: 'ap-northeast-2', profile: '' }
}

before(async () => {
  const client = await sqliteDriver.connect({ ...awsConnection, database: file }, null, { readOnly: false, connectTimeoutMs: 1000, queryTimeoutMs: 1000 })
  await client.query('CREATE TABLE t (n INTEGER)', { maxRows: 1 })
  await client.query('INSERT INTO t VALUES (7)', { maxRows: 1 })
  await client.close()
})

after(() => rmSync(dir, { recursive: true, force: true }))

test('fills blank connection fields from the secret and retries once with a fresh secret', async () => {
  const secrets = new FakeSecrets()
  const service = new DbService({
    getConnection: async () => awsConnection,
    password: async () => null,
    settings: async () => DEFAULT_SETTINGS,
    approvals: new ApprovalQueue({ timeoutMs: 1000 }),
    log: new QueryLog(),
    secrets
  })

  secrets.answers = [secret(file)]
  const rows = await service.query({ id: 'aws', sql: 'SELECT n FROM t', source: 'panel' })
  assert.deepEqual(rows.rows, [{ n: 7 }])
  assert.deepEqual(secrets.calls, [{ fresh: false }])

  // The cached secret points at a file that no longer opens; the fresh one works.
  secrets.calls = []
  secrets.answers = [secret(path.join(dir, 'missing', 'nope.db')), secret(file)]
  const again = await service.test('aws')
  assert.equal(again.ok, true, again.message)
  assert.deepEqual(secrets.calls, [{ fresh: false }, { fresh: true }])

  // Two failures in a row surface the error.
  secrets.calls = []
  secrets.answers = [secret(path.join(dir, 'missing', 'a.db')), secret(path.join(dir, 'missing', 'b.db'))]
  const failed = await service.test('aws')
  assert.equal(failed.ok, false)
  assert.deepEqual(secrets.calls, [{ fresh: false }, { fresh: true }])
})
