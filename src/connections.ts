// Worker-side registry of saved connections. The list lives in the plugin's own storage
// (storage:own) and each password in its encrypted secrets (secrets:own), so a panel, a worker
// restart and the next Orca start all see the same data.
import type { OrcaWorkerApi } from 'orca/worker'
import { hostError } from './errors'
import { DB_DRIVER_KINDS, type DbConnection, type DbDriverKind } from './protocol'

export const CONNECTIONS_KEY = 'connections'

export function passwordSecretKey(id: string): string {
  return `connection.${id}.password`
}

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i

function isDriverKind(value: unknown): value is DbDriverKind {
  return typeof value === 'string' && (DB_DRIVER_KINDS as readonly string[]).includes(value)
}

function isConnection(value: unknown): value is DbConnection {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    isDriverKind(c.driver) &&
    typeof c.host === 'string' &&
    typeof c.port === 'number' &&
    typeof c.database === 'string' &&
    typeof c.user === 'string'
  )
}

/** Checks a connection a panel sent and returns it trimmed; throws `invalid_params` otherwise. */
export function validateConnection(input: unknown): DbConnection {
  if (!isConnection(input)) {
    throw hostError('invalid_params', 'connection needs id, name, driver, host, port, database and user')
  }
  const id = input.id.trim()
  const name = input.name.trim()
  if (!ID_PATTERN.test(id)) {
    throw hostError('invalid_params', `connection id "${input.id}" must be 1-64 letters, digits, ".", "_" or "-"`)
  }
  if (name === '') {
    throw hostError('invalid_params', 'connection name must not be empty')
  }
  if (!Number.isInteger(input.port) || input.port < 0 || input.port > 65535) {
    throw hostError('invalid_params', `port ${input.port} is not between 0 and 65535`)
  }
  return {
    id,
    name,
    driver: input.driver,
    host: input.host.trim(),
    port: input.port,
    database: input.database.trim(),
    user: input.user.trim()
  }
}

export function describeConnection(connection: DbConnection): string {
  if (connection.driver === 'sqlite') {
    return `sqlite:${connection.database || '(no file)'}`
  }
  const user = connection.user ? `${connection.user}@` : ''
  return `${connection.driver}://${user}${connection.host}:${connection.port}/${connection.database}`
}

export class ConnectionStore {
  constructor(private readonly orca: OrcaWorkerApi) {}

  async list(): Promise<DbConnection[]> {
    const stored = await this.orca.storage.get(CONNECTIONS_KEY)
    return Array.isArray(stored) ? stored.filter(isConnection) : []
  }

  async get(id: string): Promise<DbConnection | null> {
    return (await this.list()).find((connection) => connection.id === id) ?? null
  }

  /** Adds or replaces by id. A password given is stored; `undefined` keeps the stored one. */
  async save(connection: DbConnection, password?: string): Promise<DbConnection> {
    const list = await this.list()
    const index = list.findIndex((existing) => existing.id === connection.id)
    if (index === -1) {
      list.push(connection)
    } else {
      list[index] = connection
    }
    await this.orca.storage.set(CONNECTIONS_KEY, list)
    if (typeof password === 'string') {
      if (password === '') {
        await this.orca.secrets.delete(passwordSecretKey(connection.id))
      } else {
        await this.orca.secrets.set(passwordSecretKey(connection.id), password)
      }
    }
    return connection
  }

  async remove(id: string): Promise<boolean> {
    const list = await this.list()
    const next = list.filter((connection) => connection.id !== id)
    if (next.length === list.length) {
      return false
    }
    await this.orca.storage.set(CONNECTIONS_KEY, next)
    await this.orca.secrets.delete(passwordSecretKey(id))
    return true
  }

  async password(id: string): Promise<string | null> {
    const value = await this.orca.secrets.get(passwordSecretKey(id))
    return typeof value === 'string' ? value : null
  }
}
