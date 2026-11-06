// The plugin's own worker (`main` in orca-plugin.json). Orca starts it on the panel's first
// plugin.request and transpiles this file when it loads: no build step. A save restarts it and
// drops its in-memory state, so everything that must last is in orca.storage / orca.secrets.
import type { OrcaWorkerApi } from 'orca/worker'
import { ConnectionStore, describeConnection, validateConnection } from './connections'
import { getDriver } from './drivers'
import { errorMessage, hostError } from './errors'
import type { QueryResult } from './protocol'

const DEFAULT_QUERY_TIMEOUT_MS = 30_000
const DEFAULT_MAX_ROWS = 500

function integerSetting(settings: Record<string, unknown>, key: string, fallback: number): number {
  const value = settings[key]
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

export default async function activate(orca: OrcaWorkerApi): Promise<void> {
  const store = new ConnectionStore(orca)

  const announce = async (): Promise<void> => {
    orca.panels.post('connections.changed', { count: (await store.list()).length })
  }

  orca.panels.handle('connections.list', async () => ({ connections: await store.list() }))

  orca.panels.handle('connections.save', async ({ connection, password }) => {
    const saved = await store.save(validateConnection(connection), password)
    await announce()
    return { connection: saved }
  })

  orca.panels.handle('connections.remove', async ({ id }) => {
    const removed = await store.remove(id)
    if (removed) {
      await announce()
    }
    return { removed }
  })

  orca.panels.handle('connections.test', async ({ id }) => {
    const started = Date.now()
    const connection = await store.get(id)
    if (connection === null) {
      throw hostError('invalid_params', `unknown connection: ${id}`)
    }
    const driver = getDriver(connection.driver)
    if (driver === null) {
      return {
        ok: false,
        message: `No ${connection.driver} driver is bundled in this version yet.`,
        durationMs: Date.now() - started
      }
    }
    try {
      const client = await driver.connect(connection, await store.password(id))
      try {
        await client.ping()
      } finally {
        await client.close()
      }
      return {
        ok: true,
        message: `Connected to ${describeConnection(connection)}`,
        durationMs: Date.now() - started
      }
    } catch (error) {
      orca.log(`connections.test ${id} failed: ${errorMessage(error)}`)
      return { ok: false, message: errorMessage(error), durationMs: Date.now() - started }
    }
  })

  orca.panels.handle('query.run', async ({ id, sql }, { signal }): Promise<QueryResult> => {
    if (typeof sql !== 'string' || sql.trim() === '') {
      throw hostError('invalid_params', 'sql must not be empty')
    }
    const connection = await store.get(id)
    if (connection === null) {
      throw hostError('invalid_params', `unknown connection: ${id}`)
    }
    const driver = getDriver(connection.driver)
    if (driver === null) {
      throw hostError('unavailable', `No ${connection.driver} driver is bundled in this version yet.`)
    }
    const settings = await orca.settings.get()
    const options = {
      timeoutMs: integerSetting(settings, 'queryTimeoutMs', DEFAULT_QUERY_TIMEOUT_MS),
      maxRows: integerSetting(settings, 'maxRows', DEFAULT_MAX_ROWS),
      signal
    }
    const client = await driver.connect(connection, await store.password(id))
    try {
      return await client.query(sql, options)
    } finally {
      await client.close()
    }
  })

  orca.log('DB Connector worker ready')
}

export async function deactivate(): Promise<void> {
  // Clients are opened per request and closed in the handlers; nothing to flush yet.
}
