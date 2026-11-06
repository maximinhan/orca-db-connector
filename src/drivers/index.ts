// Driver registry. A driver turns a saved connection (plus its password) into a client the
// worker can ping and query. Nothing is registered yet: adding a driver is the next step.
//
// How a driver may be shipped (see docs/orca-plugin-development.md, "의존성"):
// - Node built-ins only (for example `node:sqlite`): import it here, no build step.
// - An npm package (`pg`, `mysql2`): bundle it with esbuild into a committed file, because an
//   installed plugin cannot carry node_modules and every file is hashed at install.
import type { DbConnection, DbDriverKind, QueryResult } from '../protocol'

export type QueryOptions = {
  timeoutMs: number
  maxRows: number
  signal?: AbortSignal
}

export type DbClient = {
  /** Resolves when the server answers; rejects with the server's message. */
  ping(): Promise<void>
  query(sql: string, options: QueryOptions): Promise<QueryResult>
  close(): Promise<void>
}

export type DbDriver = {
  readonly kind: DbDriverKind
  readonly label: string
  connect(connection: DbConnection, password: string | null): Promise<DbClient>
}

const registry = new Map<DbDriverKind, DbDriver>()

export function registerDriver(driver: DbDriver): void {
  registry.set(driver.kind, driver)
}

export function getDriver(kind: DbDriverKind): DbDriver | null {
  return registry.get(kind) ?? null
}

export function availableDrivers(): DbDriverKind[] {
  return [...registry.keys()]
}
