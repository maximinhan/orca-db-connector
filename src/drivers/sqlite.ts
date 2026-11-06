// SQLite through Node's built-in `node:sqlite` (no dependency, no build). `database` is the
// file path; `~/` expands to the home directory. Read-only sessions open the file read-only, so
// the engine itself refuses writes.
import { homedir } from 'node:os'
import path from 'node:path'
import { hostError } from '../errors.ts'
import type { DbConnection, SchemaTable } from '../protocol.ts'
import { classifySql } from '../sql/classify.ts'
import { changesResult, resultFromArrays } from './values.ts'
import { inTransaction, type ConnectOptions, type DbClient, type DbDriver, type QueryOptions } from './types.ts'

// The `node:sqlite` surface this driver uses, typed here so the plugin's tsconfig needs no @types/node.
type StatementSync = {
  columns(): { name: string }[]
  iterate(): IterableIterator<Record<string, unknown>>
  run(): { changes: number | bigint; lastInsertRowid: number | bigint }
  get(): unknown
}
type DatabaseSync = {
  prepare(sql: string): StatementSync
  exec(sql: string): void
  close(): void
}
type SqliteModule = {
  DatabaseSync: new (file: string, options: { readOnly: boolean }) => DatabaseSync
}

async function loadSqlite(): Promise<SqliteModule> {
  try {
    return (await import('node:sqlite')) as unknown as SqliteModule
  } catch (error) {
    throw hostError(
      'unavailable',
      `node:sqlite is not available in this Node (${process.versions.node}): ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function resolveDatabasePath(database: string): string {
  const trimmed = database.trim()
  if (trimmed === ':memory:') {
    return trimmed
  }
  const expanded = trimmed === '~' || trimmed.startsWith('~/') ? path.join(homedir(), trimmed.slice(1)) : trimmed
  return path.resolve(expanded)
}

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`
}

class SqliteClient implements DbClient {
  private readonly db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
  }

  async ping(): Promise<void> {
    this.db.prepare('SELECT 1').get()
  }

  async query(sql: string, options: QueryOptions): Promise<import('../protocol.ts').QueryResult> {
    if (options.transaction) {
      return inTransaction(async (text) => this.db.exec(text), () => this.run(sql, options))
    }
    return this.run(sql, options)
  }

  private async run(sql: string, options: QueryOptions): Promise<import('../protocol.ts').QueryResult> {
    const started = Date.now()
    const { statements } = classifySql(sql)
    if (statements > 1) {
      // prepare() takes one statement; a script runs through exec() and reports no rows.
      this.db.exec(sql)
      return changesResult(0, `${statements} statements executed`, Date.now() - started)
    }
    const statement = this.db.prepare(sql)
    const columns = statement.columns().map((column) => column.name)
    if (columns.length === 0) {
      const info = statement.run()
      const changes = Number(info.changes)
      return changesResult(changes, `${changes} row(s) changed`, Date.now() - started)
    }
    const arrays = (function* () {
      for (const row of statement.iterate()) {
        yield columns.map((column) => row[column])
      }
    })()
    return resultFromArrays(columns, arrays, options.maxRows, Date.now() - started)
  }

  async listTables(): Promise<SchemaTable[]> {
    const objects = this.db
      .prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .iterate()
    const tables: SchemaTable[] = []
    for (const object of objects) {
      const name = String(object.name)
      const columns = [...this.db.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`).iterate()].map((column) => ({
        name: String(column.name),
        type: String(column.type ?? ''),
        nullable: Number(column.notnull) === 0,
        primaryKey: Number(column.pk) > 0
      }))
      tables.push({ schema: null, name, kind: object.type === 'view' ? 'view' : 'table', columns })
    }
    return tables
  }

  async close(): Promise<void> {
    this.db.close()
  }
}

export const sqliteDriver: DbDriver = {
  kind: 'sqlite',
  label: 'SQLite',
  async connect(connection: DbConnection, _password: string | null, options: ConnectOptions): Promise<DbClient> {
    const { DatabaseSync } = await loadSqlite()
    const file = resolveDatabasePath(connection.database)
    if (file === '') {
      throw hostError('invalid_params', 'sqlite connection needs a database file path')
    }
    return new SqliteClient(new DatabaseSync(file, { readOnly: options.readOnly }))
  }
}
