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
}

export type DbCell = string | number | boolean | null

export type QueryResult = {
  columns: string[]
  rows: Record<string, DbCell>[]
  rowCount: number
  /** True when rows past the `maxRows` setting were dropped. */
  truncated: boolean
  durationMs: number
}

export type ConnectionTestResult = {
  ok: boolean
  message: string
  durationMs: number
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
    /** Runs one SQL statement and answers at most `maxRows` rows. */
    'query.run': { input: { id: string; sql: string }; output: QueryResult }
  }
  // oxlint-disable-next-line typescript/consistent-type-definitions -- declaration merging needs an interface
  interface PluginPanelEvents {
    /** Posted to every open panel after a connection is saved or removed. */
    'connections.changed': { count: number }
  }
}
