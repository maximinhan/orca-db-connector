// Worker-side registry of saved connections. The list lives in the plugin's own storage
// (storage:own) and each password in its encrypted secrets (secrets:own), so a panel, a worker
// restart and the next Orca start all see the same data.
import { hostError } from './errors.ts'
import { DB_DRIVER_KINDS, type AgentWritePolicy, type DbConnection, type DbCredentials, type DbDriverKind } from './protocol.ts'

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

type OptionalFields = 'environment' | 'agent' | 'agentWrites' | 'dangerous' | 'credentials'
type StoredConnection = Omit<DbConnection, OptionalFields> & Partial<Record<OptionalFields, unknown>>

function isStoredConnection(value: unknown): value is StoredConnection {
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

const ENVIRONMENT_MAX = 32
const SECRET_ID_MAX = 2048

function normalizeCredentials(value: unknown): DbCredentials {
  if (typeof value === 'object' && value !== null && (value as { source?: unknown }).source === 'aws-secrets-manager') {
    const aws = value as Record<string, unknown>
    return {
      source: 'aws-secrets-manager',
      secretId: typeof aws.secretId === 'string' ? aws.secretId.trim().slice(0, SECRET_ID_MAX) : '',
      region: typeof aws.region === 'string' ? aws.region.trim().slice(0, 64) : '',
      profile: typeof aws.profile === 'string' ? aws.profile.trim().slice(0, 128) : ''
    }
  }
  return { source: 'password' }
}

/** Fills defaults for fields added after a connection was stored. */
function normalize(stored: StoredConnection): DbConnection {
  return {
    id: stored.id,
    name: stored.name,
    driver: stored.driver,
    host: stored.host,
    port: stored.port,
    database: stored.database,
    user: stored.user,
    environment: typeof stored.environment === 'string' ? stored.environment.trim().slice(0, ENVIRONMENT_MAX) : '',
    agent: typeof stored.agent === 'boolean' ? stored.agent : true,
    agentWrites: stored.agentWrites === 'always' ? 'always' : 'ask',
    dangerous: stored.dangerous === true,
    credentials: normalizeCredentials(stored.credentials)
  }
}

/** Whether a write on this connection must wait for the person, by policy. */
export function writeNeedsApproval(connection: DbConnection): boolean {
  return connection.dangerous || connection.agentWrites !== 'always'
}

export function agentWritePolicy(value: unknown): AgentWritePolicy {
  return value === 'always' ? 'always' : 'ask'
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
  const normalized = normalize({ ...input, id, name, host: input.host.trim(), database: input.database.trim(), user: input.user.trim() })
  if (typeof input.environment === 'string' && input.environment.trim().length > ENVIRONMENT_MAX) {
    throw hostError('invalid_params', `environment label must be at most ${ENVIRONMENT_MAX} characters`)
  }
  if (normalized.credentials.source === 'aws-secrets-manager' && normalized.credentials.secretId === '') {
    throw hostError('invalid_params', 'an AWS Secrets Manager connection needs the secret name or ARN')
  }
  if (normalized.credentials.source === 'aws-secrets-manager' && !/^[A-Za-z0-9/_+=.@:-]+$/.test(normalized.credentials.secretId)) {
    throw hostError('invalid_params', 'the AWS secret name or ARN has characters AWS does not allow')
  }
  return normalized
}

export function describeConnection(connection: DbConnection): string {
  const target =
    connection.driver === 'sqlite'
      ? `sqlite:${connection.database || '(no file)'}`
      : connection.credentials.source === 'aws-secrets-manager' && connection.host === ''
        ? `${connection.driver} via AWS secret ${connection.credentials.secretId}`
        : `${connection.driver}://${connection.user ? `${connection.user}@` : ''}${connection.host}:${connection.port}/${connection.database}`
  return connection.environment ? `[${connection.environment}] ${target}` : target
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
