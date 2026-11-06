// MySQL and MariaDB through `mysql2` (promise API), bundled by build/build.mjs into
// vendor/mysql2.cjs. Read-only sessions set the transaction access mode to READ ONLY, so the
// server refuses writes (MySQL 5.7+, MariaDB 10.0+).
import { createRequire } from 'node:module'
import { hostError } from '../errors.ts'
import type { DbConnection, QueryResult, SchemaTable } from '../protocol.ts'
import type { ConnectOptions, DbClient, DbDriver, QueryOptions } from './types.ts'
import { changesResult, resultFromArrays } from './values.ts'

type MysqlField = { name: string }
type ResultSetHeader = { affectedRows: number; info?: string }
type MysqlConnection = {
  query(options: { sql: string; timeout?: number; rowsAsArray?: boolean }): Promise<[unknown, MysqlField[] | undefined]>
  end(): Promise<void>
  destroy(): void
}
type MysqlModule = {
  createConnection(config: Record<string, unknown>): Promise<MysqlConnection>
}

const require = createRequire(import.meta.url)
let mysqlModule: MysqlModule | null = null

function loadMysql(): MysqlModule {
  if (mysqlModule === null) {
    try {
      mysqlModule = require('../../vendor/mysql2.cjs') as MysqlModule
    } catch (error) {
      throw hostError(
        'unavailable',
        `the bundled MySQL driver (vendor/mysql2.cjs) failed to load: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return mysqlModule
}

const SCHEMA_SQL = `
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, t.TABLE_TYPE, c.COLUMN_NAME, c.COLUMN_TYPE, c.IS_NULLABLE, c.COLUMN_KEY
FROM information_schema.COLUMNS c
JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
WHERE c.TABLE_SCHEMA = DATABASE()
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`

class MysqlClient implements DbClient {
  private readonly connection: MysqlConnection
  private readonly queryTimeoutMs: number

  constructor(connection: MysqlConnection, queryTimeoutMs: number) {
    this.connection = connection
    this.queryTimeoutMs = queryTimeoutMs
  }

  async ping(): Promise<void> {
    await this.connection.query({ sql: 'SELECT 1', timeout: this.queryTimeoutMs })
  }

  async query(sql: string, options: QueryOptions): Promise<QueryResult> {
    const started = Date.now()
    const onAbort = () => this.connection.destroy()
    options.signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const [rows, fields] = await this.connection.query({ sql, timeout: this.queryTimeoutMs, rowsAsArray: true })
      if (fields === undefined || fields.length === 0 || !Array.isArray(rows)) {
        const header = rows as ResultSetHeader
        const changed = typeof header?.affectedRows === 'number' ? header.affectedRows : 0
        return changesResult(changed, header?.info || `${changed} row(s) affected`, Date.now() - started)
      }
      return resultFromArrays(
        fields.map((field) => field.name),
        rows as unknown[][],
        options.maxRows,
        Date.now() - started
      )
    } finally {
      options.signal?.removeEventListener('abort', onAbort)
    }
  }

  async listTables(): Promise<SchemaTable[]> {
    const [rows] = await this.connection.query({ sql: SCHEMA_SQL, timeout: this.queryTimeoutMs, rowsAsArray: true })
    const tables = new Map<string, SchemaTable>()
    for (const row of (rows as unknown[][]) ?? []) {
      const [schema, name, tableType, column, type, nullable, columnKey] = row as [string, string, string, string, string, string, string]
      const key = `${schema}.${name}`
      let table = tables.get(key)
      if (table === undefined) {
        table = { schema, name, kind: tableType === 'VIEW' ? 'view' : 'table', columns: [] }
        tables.set(key, table)
      }
      table.columns.push({ name: column, type, nullable: nullable === 'YES', primaryKey: columnKey === 'PRI' })
    }
    return [...tables.values()]
  }

  async close(): Promise<void> {
    await this.connection.end()
  }
}

export const mysqlDriver: DbDriver = {
  kind: 'mysql',
  label: 'MySQL / MariaDB',
  async connect(connection: DbConnection, password: string | null, options: ConnectOptions): Promise<DbClient> {
    const mysql = loadMysql()
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.user,
      ...(password === null ? {} : { password }),
      connectTimeout: options.connectTimeoutMs,
      multipleStatements: false,
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true
    })
    if (options.readOnly) {
      await conn.query({ sql: 'SET SESSION TRANSACTION READ ONLY', timeout: options.queryTimeoutMs })
    }
    return new MysqlClient(conn, options.queryTimeoutMs)
  }
}
