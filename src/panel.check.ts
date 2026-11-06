// `orca plugin check .` renders the panel once per scenario, each with the worker on a fresh
// host. Seed what the worker reads so check shows more than the empty state.
import { defineCheck } from 'orca/testing'

export default defineCheck({
  empty: {},
  'two connections': {
    storage: {
      connections: [
        {
          id: 'local-pg',
          name: 'Local Postgres',
          driver: 'postgres',
          host: 'localhost',
          port: 5432,
          database: 'app',
          user: 'app'
        },
        {
          id: 'reports',
          name: 'Reports (SQLite)',
          driver: 'sqlite',
          host: '',
          port: 0,
          database: '/tmp/reports.db',
          user: ''
        }
      ]
    },
    persisted: { plugin: { selectedId: 'local-pg' } }
  }
})
