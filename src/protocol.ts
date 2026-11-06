// The panel <-> worker contract, declared once: src/panel.tsx and src/worker.ts both read it.
// `declare module 'orca'` merges these names into Orca's typings, so plugin.request() and
// orca.panels.handle() are type-checked on both sides.

export type DbDriverKind = 'postgres' | 'mysql' | 'sqlite'

export const DB_DRIVER_KINDS: readonly DbDriverKind[] = ['postgres', 'mysql', 'sqlite']

/** A saved connection. The password is never part of it: it lives in the plugin's secrets. */
export type DbConnection = {
  id: string
  name: string
  driver: DbDriverKind
  /** For `sqlite`, the database file path goes in `database` and `host`/`port`/`user` are unused. */
  host: string
  port: number
  database: string
  user: string
  /** Whether agents launched from Orca may use this connection through the gateway. */
  agent: boolean
}

export type DbCell = string | number | boolean | null

export type QueryResult = {
  columns: string[]
  rows: Record<string, DbCell>[]
  /** Rows returned, or rows changed by a statement that returns none. */
  rowCount: number
  /** True when rows past `maxRows` were dropped. */
  truncated: boolean
  durationMs: number
  /** The server's status line for a statement without rows, such as "INSERT 0 3". */
  message?: string
}

export type SchemaColumn = {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
}

export type SchemaTable = {
  /** Schema or database name; null where the engine has none (SQLite). */
  schema: string | null
  name: string
  kind: 'table' | 'view'
  columns: SchemaColumn[]
}

export type ConnectionTestResult = {
  ok: boolean
  message: string
  durationMs: number
}

/** What agents may do through the gateway; the `agentAccess` setting. */
export type AgentAccess = 'off' | 'read-only' | 'read-write'

export type GatewayStatus = {
  running: boolean
  /** `http://127.0.0.1:<port>` while running. */
  url: string | null
  agentAccess: AgentAccess
  /** Absolute path of the stdio MCP server agents run. */
  mcpServerPath: string
  error: string | null
}

declare module 'orca' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- declaration merging needs an interface
  interface PluginRequests {
    /** Every saved connection, without passwords. */
    'connections.list': { output: { connections: DbConnection[] } }
    /** Creates or replaces a connection; a `password` given is stored in secrets, omitted keeps the old one. */
    'connections.save': {
      input: { connection: DbConnection; password?: string }
      output: { connection: DbConnection }
    }
    /** Removes a connection and its stored password. */
    'connections.remove': { input: { id: string }; output: { removed: boolean } }
    /** Opens the connection once and closes it again. */
    'connections.test': { input: { id: string }; output: ConnectionTestResult }
    /** Tables, views and their columns. */
    'schema.list': { input: { id: string }; output: { tables: SchemaTable[] } }
    /** Runs SQL; writes are refused unless `allowWrites` is true. */
    'query.run': { input: { id: string; sql: string; allowWrites?: boolean }; output: QueryResult }
    /** Whether the agent gateway is up and what agents may do. */
    'gateway.status': { output: GatewayStatus }
  }
  // oxlint-disable-next-line typescript/consistent-type-definitions -- declaration merging needs an interface
  interface PluginPanelEvents {
    /** Posted to every open panel after a connection is saved or removed. */
    'connections.changed': { count: number }
  }
}
