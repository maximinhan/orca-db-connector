// PostgreSQL through `pg`, bundled by build/build.mjs into vendor/pg.cjs (an installed plugin
// cannot carry node_modules). Read-only sessions set default_transaction_read_only, so the
// server refuses writes.
import { createRequire } from 'node:module'
import { hostError } from '../errors.ts'
import type { DbConnection, QueryResult, SchemaTable } from '../protocol.ts'
import { inTransaction, type ConnectOptions, type DbClient, type DbDriver, type QueryOptions } from './types.ts'
import { changesResult, resultFromArrays } from './values.ts'

type PgField = { name: string }
type PgResult = { command: string; rowCount: number | null; rows: unknown[][]; fields: PgField[] }
type PgClient = {
  connect(): Promise<void>
  query(config: { text: string; rowMode?: 'array' }): Promise<PgResult | PgResult[]>
  end(): Promise<void>
}
type PgModule = {
  Client: new (config: Record<string, unknown>) => PgClient
}

const require = createRequire(import.meta.url)
let pgModule: PgModule | null = null

function loadPg(): PgModule {
  if (pgModule === null) {
    try {
      pgModule = require('../../vendor/pg.cjs') as PgModule
    } catch (error) {
      throw hostError(
        'unavailable',
        `the bundled PostgreSQL driver (vendor/pg.cjs) failed to load: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return pgModule
}

const SCHEMA_SQL = `
SELECT c.table_schema, c.table_name, t.table_type, c.column_name, c.data_type, c.is_nullable,
       EXISTS (
         SELECT 1 FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage k
           ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema AND k.table_name = tc.table_name
         WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = c.table_schema
           AND tc.table_name = c.table_name AND k.column_name = c.column_name
       ) AS primary_key
FROM information_schema.columns c
JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.table_schema, c.table_name, c.ordinal_position`

class PostgresClient implements DbClient {
  private readonly client: PgClient

  constructor(client: PgClient) {
    this.client = client
  }

  async ping(): Promise<void> {
    await this.client.query({ text: 'SELECT 1' })
  }

  async query(sql: string, options: QueryOptions): Promise<QueryResult> {
    if (options.transaction) {
      return inTransaction((text) => this.client.query({ text }), () => this.run(sql, options))
    }
    return this.run(sql, options)
  }

  private async run(sql: string, options: QueryOptions): Promise<QueryResult> {
    const started = Date.now()
    const onAbort = () => void this.client.end().catch(() => undefined)
    options.signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const answer = await this.client.query({ text: sql, rowMode: 'array' })
      const results = Array.isArray(answer) ? answer : [answer]
      const last = results.findLast((result) => result.fields.length > 0) ?? results[results.length - 1]
      if (last === undefined || last.fields.length === 0) {
        const changed = results.reduce((sum, result) => sum + (result.rowCount ?? 0), 0)
        const message = results.map((result) => `${result.command} ${result.rowCount ?? 0}`).join('; ')
        return changesResult(changed, message, Date.now() - started)
      }
      return resultFromArrays(
        last.fields.map((field) => field.name),
        last.rows,
        options.maxRows,
        Date.now() - started
      )
    } finally {
      options.signal?.removeEventListener('abort', onAbort)
    }
  }

  async listTables(): Promise<SchemaTable[]> {
    const answer = await this.client.query({ text: SCHEMA_SQL, rowMode: 'array' })
    const result = Array.isArray(answer) ? answer[0] : answer
    const tables = new Map<string, SchemaTable>()
    for (const row of result?.rows ?? []) {
      const [schema, name, tableType, column, type, nullable, primaryKey] = row as [string, string, string, string, string, string, boolean]
      const key = `${schema}.${name}`
      let table = tables.get(key)
      if (table === undefined) {
        table = { schema, name, kind: tableType === 'VIEW' ? 'view' : 'table', columns: [] }
        tables.set(key, table)
      }
      table.columns.push({ name: column, type, nullable: nullable === 'YES', primaryKey: primaryKey === true })
    }
    return [...tables.values()]
  }

  async close(): Promise<void> {
    await this.client.end()
  }
}

export const postgresDriver: DbDriver = {
  kind: 'postgres',
  label: 'PostgreSQL',
  async connect(connection: DbConnection, password: string | null, options: ConnectOptions): Promise<DbClient> {
    const { Client } = loadPg()
    const client = new Client({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.user,
      ...(password === null ? {} : { password }),
      application_name: 'orca-db-connector',
      connectionTimeoutMillis: options.connectTimeoutMs,
      statement_timeout: options.queryTimeoutMs,
      query_timeout: options.queryTimeoutMs + 1000
    })
    await client.connect()
    if (options.readOnly) {
      await client.query({ text: 'SET default_transaction_read_only = on' })
    }
    return new PostgresClient(client)
  }
}
