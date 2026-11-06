// What both the panel and the agent gateway do with a connection: test it, list its schema and
// run SQL. Sessions are opened per call and closed again. Reads run in a read-only session, so the
// engine enforces it; writes run inside a transaction after the policy below allowed them, and
// every query lands in the log with its outcome.
import { describeConnection, writeNeedsApproval } from '../connections.ts'
import { loadDriver } from '../drivers/index.ts'
import { errorMessage, hostError, type HostError } from '../errors.ts'
import type {
  AgentAccess,
  ConnectionTestResult,
  DbConnection,
  QueryLogEntry,
  QueryResult,
  QuerySource,
  SchemaTable
} from '../protocol.ts'
import { classifySql } from '../sql/classify.ts'
import type { ApprovalQueue } from '../approvals/queue.ts'
import type { QueryLog } from '../log/query-log.ts'

export type DbServiceSettings = {
  queryTimeoutMs: number
  maxRows: number
  connectTimeoutMs: number
  agentAccess: AgentAccess
}

export type DbServiceDeps = {
  getConnection(id: string): Promise<DbConnection | null>
  password(id: string): Promise<string | null>
  settings(): Promise<DbServiceSettings>
  approvals: ApprovalQueue
  log: QueryLog
  trace?(message: string): void
}

export type QueryRequest = {
  id: string
  sql: string
  source: QuerySource
  /** Orca's agent id when the gateway caller said who it is. */
  agent?: string | null
  /** Panel only: the person ticked "Allow writes". */
  allowWrites?: boolean
  /** Panel only: the person confirmed a write on a dangerous connection. */
  confirmed?: boolean
  maxRows?: number
  signal?: AbortSignal
}

export const DEFAULT_SETTINGS: DbServiceSettings = {
  queryTimeoutMs: 30_000,
  maxRows: 500,
  connectTimeoutMs: 10_000,
  agentAccess: 'read-only'
}

type WriteAllowance = { allowed: true; approval: 'auto' | 'approved' } | { allowed: false; status: 'denied' | 'timeout'; error: HostError }

export class DbService {
  private readonly deps: DbServiceDeps

  constructor(deps: DbServiceDeps) {
    this.deps = deps
  }

  private async connection(id: string): Promise<DbConnection> {
    const connection = await this.deps.getConnection(id)
    if (connection === null) {
      throw hostError('invalid_params', `unknown connection: ${id}`)
    }
    return connection
  }

  private async open(connection: DbConnection, readOnly: boolean) {
    const settings = await this.deps.settings()
    const driver = await loadDriver(connection.driver)
    const client = await driver.connect(connection, await this.deps.password(connection.id), {
      readOnly,
      connectTimeoutMs: settings.connectTimeoutMs,
      queryTimeoutMs: settings.queryTimeoutMs
    })
    return { client, settings }
  }

  async test(id: string): Promise<ConnectionTestResult> {
    const started = Date.now()
    const connection = await this.connection(id)
    try {
      const { client } = await this.open(connection, true)
      try {
        await client.ping()
      } finally {
        await client.close()
      }
      return { ok: true, message: `Connected to ${describeConnection(connection)}`, durationMs: Date.now() - started }
    } catch (error) {
      this.deps.trace?.(`connections.test ${id}: ${errorMessage(error)}`)
      return { ok: false, message: errorMessage(error), durationMs: Date.now() - started }
    }
  }

  async schema(id: string): Promise<SchemaTable[]> {
    const connection = await this.connection(id)
    const { client } = await this.open(connection, true)
    try {
      return await client.listTables()
    } finally {
      await client.close()
    }
  }

  /** Decides whether a write may run now, asking the person when the policy says so. */
  private async allowWrite(connection: DbConnection, request: QueryRequest, settings: DbServiceSettings): Promise<WriteAllowance> {
    const refused = (message: string): WriteAllowance => ({ allowed: false, status: 'denied', error: hostError('not_permitted', message) })
    if (request.source === 'panel') {
      if (request.allowWrites !== true) {
        return refused('this statement writes; tick "Allow writes" to run it')
      }
      if (connection.dangerous && request.confirmed !== true) {
        return refused(`${connection.name} is marked dangerous; confirm the write first`)
      }
      return { allowed: true, approval: 'auto' }
    }
    if (settings.agentAccess !== 'read-write') {
      return refused('agents may only read; set Agent access to "Read and write" in the plugin settings')
    }
    if (!writeNeedsApproval(connection)) {
      return { allowed: true, approval: 'auto' }
    }
    const decision = await this.deps.approvals.request(
      {
        connectionId: connection.id,
        connectionName: connection.name,
        environment: connection.environment,
        dangerous: connection.dangerous,
        agent: request.agent ?? null,
        sql: request.sql
      },
      request.signal
    )
    if (decision === 'approved') {
      return { allowed: true, approval: 'approved' }
    }
    if (decision === 'timeout') {
      return { allowed: false, status: 'timeout', error: hostError('timeout', 'nobody approved the write in time') }
    }
    return { allowed: false, status: 'denied', error: hostError('not_permitted', 'the write was refused in Orca') }
  }

  async query(request: QueryRequest): Promise<QueryResult> {
    if (typeof request.sql !== 'string') {
      throw hostError('invalid_params', 'sql must be a string')
    }
    const classified = classifySql(request.sql)
    if (classified.kind === 'empty') {
      throw hostError('invalid_params', 'sql must not be empty')
    }
    const connection = await this.connection(request.id)
    const settings = await this.deps.settings()
    const started = Date.now()
    const entry = (fields: Pick<QueryLogEntry, 'status' | 'approval' | 'rowCount' | 'error'>) =>
      this.deps.log.append(
        {
          source: request.source,
          agent: request.agent ?? null,
          connectionId: connection.id,
          connectionName: connection.name,
          environment: connection.environment,
          dangerous: connection.dangerous,
          sql: request.sql,
          kind: classified.kind === 'read' ? 'read' : 'write',
          durationMs: Date.now() - started,
          ...fields
        },
        null
      )

    let approval: 'auto' | 'approved' | null = null
    if (classified.kind !== 'read') {
      const allowance = await this.allowWrite(connection, request, settings)
      if (!allowance.allowed) {
        entry({ status: allowance.status, approval: null, rowCount: 0, error: allowance.error.message })
        throw allowance.error
      }
      approval = allowance.approval
    }

    const write = classified.kind !== 'read'
    try {
      const { client } = await this.open(connection, !write)
      try {
        const requested = request.maxRows
        const maxRows =
          typeof requested === 'number' && Number.isInteger(requested) && requested > 0
            ? Math.min(requested, settings.maxRows)
            : settings.maxRows
        const result = await client.query(request.sql, { maxRows, signal: request.signal, transaction: write })
        const logged = this.deps.log.append(
          {
            source: request.source,
            agent: request.agent ?? null,
            connectionId: connection.id,
            connectionName: connection.name,
            environment: connection.environment,
            dangerous: connection.dangerous,
            sql: request.sql,
            kind: write ? 'write' : 'read',
            status: 'ok',
            approval,
            rowCount: result.rowCount,
            durationMs: Date.now() - started,
            error: null
          },
          result
        )
        this.deps.trace?.(`${request.source} ${logged.kind} on ${connection.name}: ${result.rowCount} rows in ${result.durationMs} ms`)
        return result
      } finally {
        await client.close()
      }
    } catch (error) {
      entry({ status: 'error', approval, rowCount: 0, error: errorMessage(error) })
      throw error
    }
  }
}
