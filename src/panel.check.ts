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
    agent: true
  },
  {
    id: 'reports',
    name: 'Reports (SQLite)',
    driver: 'sqlite',
    host: '',
    port: 0,
    database: ':memory:',
    user: '',
    agent: false
  }
]

export default defineCheck({
  empty: {},
  'two connections': {
    storage: { connections },
    persisted: { plugin: { selectedId: 'local-pg' } }
  },
  'gateway off': {
    storage: { connections },
    settings: { agentAccess: 'off' },
    persisted: { plugin: { selectedId: 'reports' } }
  }
})
