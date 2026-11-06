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
