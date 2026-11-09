// The panel <-> worker contract, declared once: src/panel.tsx and src/worker.ts both read it.
// `declare module 'orca'` merges these names into Orca's typings, so plugin.request() and
// orca.panels.handle() are type-checked on both sides.

export type DbDriverKind = 'postgres' | 'mysql' | 'sqlite'

export const DB_DRIVER_KINDS: readonly DbDriverKind[] = ['postgres', 'mysql', 'sqlite']

/** What an agent's write statement does on this connection: run at once, or wait for the person. */
export type AgentWritePolicy = 'ask' | 'always'

/** Where the password (and, for an RDS-style secret, missing host/port/user/database) comes from. */
export type DbCredentials =
  | { source: 'password' }
  | {
      source: 'aws-secrets-manager'
      /** Secret name or ARN. */
      secretId: string
      /** Empty: AWS_REGION, AWS_DEFAULT_REGION or the profile's region. */
      region: string
      /** Empty: AWS_PROFILE or `default`. */
      profile: string
    }

/** A saved connection. The password is never part of it: it lives in the plugin's secrets or in AWS. */
export type DbConnection = {
  id: string
  name: string
  driver: DbDriverKind
  /** For `sqlite`, the database file path goes in `database` and `host`/`port`/`user` are unused. */
  host: string
  port: number
  database: string
  user: string
  /** Free text shown beside the name, such as `local`, `staging` or `prod`. */
  environment: string
  /** Whether agents launched from Orca may use this connection through the gateway. */
  agent: boolean
  /** Agent writes run at once (`always`) or wait for approval in the panel (`ask`). */
  agentWrites: AgentWritePolicy
  /** A dangerous environment: every write is confirmed by the person, and its queries are highlighted. */
  dangerous: boolean
  credentials: DbCredentials
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
  /** File the MCP server reads the gateway address and token from when its environment has none. */
  discoveryPath: string
  error: string | null
}

export type QuerySource = 'panel' | 'agent'

/** A write an agent asked for that waits for the person's decision in the panel. */
export type ApprovalRequest = {
  id: string
  connectionId: string
  connectionName: string
  environment: string
  dangerous: boolean
  /** Orca's agent id (`claude`, `codex`, ...) when the agent said who it is. */
  agent: string | null
  sql: string
  /** ms since the epoch. */
  createdAt: number
  /** When the request times out and the agent gets `timeout`. */
  expiresAt: number
}

export type QueryLogStatus = 'ok' | 'error' | 'denied' | 'timeout'

/** What registering the orca-db MCP server in Claude Code's user settings did. */
export type ClaudeSetupResult = {
  ok: boolean
  message: string
  /** The command to run by hand when the `claude` CLI was not found. */
  command: string
}

export type QueryLogEntry = {
  id: string
  at: number
  source: QuerySource
  agent: string | null
  connectionId: string
  connectionName: string
  environment: string
  dangerous: boolean
  /** SQL as sent, cut to a few KB in the log. */
  sql: string
  kind: 'read' | 'write'
  status: QueryLogStatus
  /** How a write was allowed: `auto` (policy), `approved` (the person), or null for reads and refusals. */
  approval: 'auto' | 'approved' | null
  rowCount: number
  durationMs: number
  error: string | null
  /** True while the worker still holds the rows (`log.result` answers them). */
  hasResult: boolean
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
    /**
     * Runs SQL from the panel. A write needs `allowWrites`, and on a dangerous connection also
     * `confirmed`; writes run inside a transaction.
     */
    'query.run': {
      input: { id: string; sql: string; allowWrites?: boolean; confirmed?: boolean }
      output: QueryResult
    }
    /** Whether the agent gateway is up and what agents may do. */
    'gateway.status': { output: GatewayStatus }
    /** Agent writes waiting for a decision, oldest first. */
    'approvals.list': { output: { approvals: ApprovalRequest[] } }
    /** Lets an agent write run, or refuses it. */
    'approvals.decide': { input: { id: string; approve: boolean }; output: { decided: boolean } }
    /** Recent queries, newest first. */
    'log.list': { output: { entries: QueryLogEntry[] } }
    /** The rows of a logged query, while the worker still holds them. */
    'log.result': { input: { id: string }; output: { result: QueryResult | null } }
    /** Forgets every logged query and its rows. */
    'log.clear': { output: { cleared: number } }
    /** Tells the worker Orca's UI language, for notifications. */
    'ui.hello': { input: { locale: string }; output: { ok: true } }
    /** Registers the orca-db MCP server in Claude Code's user settings (`claude mcp add --scope user`). */
    'claude.setup': { output: ClaudeSetupResult }
  }
  // oxlint-disable-next-line typescript/consistent-type-definitions -- declaration merging needs an interface
  interface PluginPanelEvents {
    /** Posted to every open panel after a connection is saved or removed. */
    'connections.changed': { count: number }
    /** Posted when an agent write starts or stops waiting for a decision. */
    'approvals.changed': { count: number }
    /** Posted when a query was logged or the log was cleared. */
    'log.changed': { count: number }
  }
}
