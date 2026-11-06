// `orca plugin check .` renders the panel once per scenario, each with the worker on a fresh
// host. Seed what the worker reads so check shows more than the empty state.
import { defineCheck } from 'orca/testing'

const connections = [
  {
    id: 'local-pg',
    name: 'Local Postgres',
    driver: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'app',
    user: 'app',
    environment: 'local',
    agent: true,
    agentWrites: 'always',
    dangerous: false,
    credentials: { source: 'password' }
  },
  {
    id: 'prod',
    name: 'Production',
    driver: 'postgres',
    host: 'db.example.com',
    port: 5432,
    database: 'app',
    user: 'readonly',
    environment: 'prod',
    agent: true,
    agentWrites: 'ask',
    dangerous: true,
    credentials: { source: 'password' }
  },
  {
    id: 'reports',
    name: 'Reports (SQLite)',
    driver: 'sqlite',
    host: '',
    port: 0,
    database: ':memory:',
    user: '',
    environment: '',
    agent: false,
    agentWrites: 'ask',
    dangerous: false,
    credentials: { source: 'password' }
  }
]

const queryLog = [
  {
    id: 'q-1',
    at: Date.now() - 60_000,
    source: 'agent',
    agent: 'claude',
    connectionId: 'prod',
    connectionName: 'Production',
    environment: 'prod',
    dangerous: true,
    sql: 'DELETE FROM sessions WHERE expires_at < now()',
    kind: 'write',
    status: 'denied',
    approval: null,
    rowCount: 0,
    durationMs: 12,
    error: 'the write was refused in Orca',
    hasResult: false
  },
  {
    id: 'q-2',
    at: Date.now() - 120_000,
    source: 'panel',
    agent: null,
    connectionId: 'local-pg',
    connectionName: 'Local Postgres',
    environment: 'local',
    dangerous: false,
    sql: 'SELECT id, email FROM users LIMIT 10',
    kind: 'read',
    status: 'ok',
    approval: null,
    rowCount: 10,
    durationMs: 4,
    error: null,
    hasResult: false
  }
]

export default defineCheck({
  empty: {},
  'three connections': {
    storage: { connections, queryLog },
    persisted: { plugin: { selectedId: 'local-pg' } }
  },
  'dangerous selected': {
    storage: { connections, queryLog },
    settings: { agentAccess: 'read-write' },
    persisted: { plugin: { selectedId: 'prod' } }
  },
  'gateway off': {
    storage: { connections },
    settings: { agentAccess: 'off' },
    persisted: { plugin: { selectedId: 'reports' } }
  }
})
