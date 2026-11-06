// Driver registry. Drivers load lazily so a broken bundle only fails the connections that need it.
import { hostError } from '../errors.ts'
import type { DbDriverKind } from '../protocol.ts'
import type { DbDriver } from './types.ts'

export type { ConnectOptions, DbClient, DbDriver, QueryOptions } from './types.ts'

const LABELS: Record<DbDriverKind, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlite: 'SQLite'
}

const loaders: Record<DbDriverKind, () => Promise<DbDriver>> = {
  sqlite: async () => (await import('./sqlite.ts')).sqliteDriver,
  postgres: async () => (await import('./postgres.ts')).postgresDriver,
  mysql: async () => (await import('./mysql.ts')).mysqlDriver
}

const loaded = new Map<DbDriverKind, Promise<DbDriver>>()

export function driverLabel(kind: DbDriverKind): string {
  return LABELS[kind]
}

export function loadDriver(kind: DbDriverKind): Promise<DbDriver> {
  const loader = loaders[kind]
  if (loader === undefined) {
    return Promise.reject(hostError('invalid_params', `unknown driver: ${String(kind)}`))
  }
  let pending = loaded.get(kind)
  if (pending === undefined) {
    pending = loader().catch((error: unknown) => {
      loaded.delete(kind)
      throw error
    })
    loaded.set(kind, pending)
  }
  return pending
}
