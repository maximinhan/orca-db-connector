// Worker-side registry of saved connections. The list lives in the plugin's own storage
// (storage:own) and each password in its encrypted secrets (secrets:own), so a panel, a worker
// restart and the next Orca start all see the same data.
import { hostError } from './errors.ts'
import { DB_DRIVER_KINDS, type DbConnection, type DbDriverKind } from './protocol.ts'

export const CONNECTIONS_KEY = 'connections'

/** The subset of the worker `orca` object this store needs (so tests can pass a fake). */
export type ConnectionStoreHost = {
  storage: { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void> }
  secrets: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    delete(key: string): Promise<void>
  }
}

export function passwordSecretKey(id: string): string {
  return `connection.${id}.password`
}

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i

function isDriverKind(value: unknown): value is DbDriverKind {
  return typeof value === 'string' && (DB_DRIVER_KINDS as readonly string[]).includes(value)
}

function isStoredConnection(value: unknown): value is Omit<DbConnection, 'agent'> & { agent?: unknown } {
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

/** Fills defaults for fields added after a connection was stored. */
function normalize(stored: Omit<DbConnection, 'agent'> & { agent?: unknown }): DbConnection {
  return { ...stored, agent: typeof stored.agent === 'boolean' ? stored.agent : true }
}

/** Checks a connection a panel sent and returns it trimmed; throws `invalid_params` otherwise. */
export function validateConnection(input: unknown): DbConnection {
  if (!isStoredConnection(input)) {
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
  if (input.driver === 'sqlite' && input.database.trim() === '') {
    throw hostError('invalid_params', 'a sqlite connection needs the database file path')
  }
  return {
    id,
    name,
    driver: input.driver,
    host: input.host.trim(),
    port: input.port,
    database: input.database.trim(),
    user: input.user.trim(),
    agent: typeof input.agent === 'boolean' ? input.agent : true
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
  private readonly host: ConnectionStoreHost

  constructor(host: ConnectionStoreHost) {
    this.host = host
  }

  async list(): Promise<DbConnection[]> {
    const stored = await this.host.storage.get(CONNECTIONS_KEY)
    return Array.isArray(stored) ? stored.filter(isStoredConnection).map(normalize) : []
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
    await this.host.storage.set(CONNECTIONS_KEY, list)
    if (typeof password === 'string') {
      if (password === '') {
        await this.host.secrets.delete(passwordSecretKey(connection.id))
      } else {
        await this.host.secrets.set(passwordSecretKey(connection.id), password)
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
    await this.host.storage.set(CONNECTIONS_KEY, next)
    await this.host.secrets.delete(passwordSecretKey(id))
    return true
  }

  async password(id: string): Promise<string | null> {
    const value = await this.host.secrets.get(passwordSecretKey(id))
    return typeof value === 'string' ? value : null
  }
}
