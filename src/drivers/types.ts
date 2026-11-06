import type { DbConnection, DbDriverKind, QueryResult, SchemaTable } from '../protocol.ts'

export type ConnectOptions = {
  /** Open the session so the server itself refuses writes, not only this plugin. */
  readOnly: boolean
  connectTimeoutMs: number
  /** Server-side statement timeout where the engine supports one. */
  queryTimeoutMs: number
}

export type QueryOptions = {
  maxRows: number
  signal?: AbortSignal
  /** Run inside BEGIN … COMMIT, rolling back when the statement fails. */
  transaction?: boolean
}

export type DbClient = {
  /** Resolves when the server answers; rejects with the server's message. */
  ping(): Promise<void>
  query(sql: string, options: QueryOptions): Promise<QueryResult>
  listTables(): Promise<SchemaTable[]>
  close(): Promise<void>
}

export type DbDriver = {
  readonly kind: DbDriverKind
  readonly label: string
  connect(connection: DbConnection, password: string | null, options: ConnectOptions): Promise<DbClient>
}

/** Runs `work` between BEGIN and COMMIT, rolling back on failure, for drivers that take plain SQL. */
export async function inTransaction<T>(
  exec: (sql: string) => Promise<unknown>,
  work: () => Promise<T>,
  statements: { begin: string; commit: string; rollback: string } = { begin: 'BEGIN', commit: 'COMMIT', rollback: 'ROLLBACK' }
): Promise<T> {
  await exec(statements.begin)
  try {
    const result = await work()
    await exec(statements.commit)
    return result
  } catch (error) {
    try {
      await exec(statements.rollback)
    } catch {
      // The original error is what matters; a failed rollback follows a dropped connection.
    }
    throw error
  }
}
