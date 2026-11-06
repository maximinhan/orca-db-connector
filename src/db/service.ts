// What both the panel and the agent gateway do with a connection: test it, list its schema and
// run SQL. Sessions are opened per call and closed again; a read-only call opens a read-only
// session, so the engine enforces it, and classifySql refuses writes before connecting.
import { describeConnection } from '../connections.ts'
import { loadDriver } from '../drivers/index.ts'
import { errorMessage, hostError } from '../errors.ts'
import type { ConnectionTestResult, DbConnection, QueryResult, SchemaTable } from '../protocol.ts'
import { classifySql } from '../sql/classify.ts'

export type DbServiceSettings = {
  queryTimeoutMs: number
  maxRows: number
  connectTimeoutMs: number
}

export type DbServiceDeps = {
  getConnection(id: string): Promise<DbConnection | null>
  password(id: string): Promise<string | null>
  settings(): Promise<DbServiceSettings>
  log?(message: string): void
}

export type QueryMode = 'read-only' | 'read-write'

export const DEFAULT_SETTINGS: DbServiceSettings = {
  queryTimeoutMs: 30_000,
  maxRows: 500,
  connectTimeoutMs: 10_000
}

export class DbService {
  private readonly deps: DbServiceDeps

  constructor(deps: DbServiceDeps) {
    this.deps = deps
  }

  private async connection(id: string): Promise<DbConnection> {
    const connection = await this.deps.getConnection(id)
    if (connection === null) {
      throw hostError('invalid_params', `unknown connection: ${id}`)
    }
    return connection
  }

  private async open(connection: DbConnection, readOnly: boolean) {
    const settings = await this.deps.settings()
    const driver = await loadDriver(connection.driver)
    const client = await driver.connect(connection, await this.deps.password(connection.id), {
      readOnly,
      connectTimeoutMs: settings.connectTimeoutMs,
      queryTimeoutMs: settings.queryTimeoutMs
    })
    return { client, settings }
  }

  async test(id: string): Promise<ConnectionTestResult> {
    const started = Date.now()
    const connection = await this.connection(id)
    try {
      const { client } = await this.open(connection, true)
      try {
        await client.ping()
      } finally {
        await client.close()
      }
      return { ok: true, message: `Connected to ${describeConnection(connection)}`, durationMs: Date.now() - started }
    } catch (error) {
      this.deps.log?.(`connections.test ${id}: ${errorMessage(error)}`)
      return { ok: false, message: errorMessage(error), durationMs: Date.now() - started }
    }
  }

  async schema(id: string): Promise<SchemaTable[]> {
    const connection = await this.connection(id)
    const { client } = await this.open(connection, true)
    try {
      return await client.listTables()
    } finally {
      await client.close()
    }
  }

  async query(
    id: string,
    sql: string,
    mode: QueryMode,
    options: { maxRows?: number; signal?: AbortSignal } = {}
  ): Promise<QueryResult> {
    if (typeof sql !== 'string') {
      throw hostError('invalid_params', 'sql must be a string')
    }
    const classified = classifySql(sql)
    if (classified.kind === 'empty') {
      throw hostError('invalid_params', 'sql must not be empty')
    }
    if (mode === 'read-only' && classified.kind !== 'read') {
      throw hostError(
        'not_permitted',
        `only read statements (SELECT, WITH, SHOW, EXPLAIN, DESCRIBE, PRAGMA) are allowed here; "${classified.keyword}" is not`
      )
    }
    const connection = await this.connection(id)
    const { client, settings } = await this.open(connection, mode === 'read-only')
    try {
      const requested = options.maxRows
      const maxRows =
        typeof requested === 'number' && Number.isInteger(requested) && requested > 0
          ? Math.min(requested, settings.maxRows)
          : settings.maxRows
      return await client.query(sql, { maxRows, signal: options.signal })
    } finally {
      await client.close()
    }
  }
}
