// The plugin's own worker (`main` in orca-plugin.json). Because the manifest lists a hook, Orca
// starts it when the plugin is enabled and keeps it running, so the agent gateway stays up.
// Orca transpiles this file when it loads: no build step. A restart drops in-memory state, so
// everything that must last is in orca.storage / orca.secrets.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { OrcaWorkerApi } from 'orca/worker'
import { claudeMcpConfig, decorateAgentLaunch, type AgentLaunchEvent } from './agent/launch-hook.ts'
import { ConnectionStore, validateConnection } from './connections.ts'
import { DbService, DEFAULT_SETTINGS, type DbServiceSettings } from './db/service.ts'
import { errorMessage } from './errors.ts'
import { startGateway, type Gateway } from './gateway/server.ts'
import type { AgentAccess, GatewayStatus } from './protocol.ts'

const VERSION = '0.2.0'
const AGENT_ACCESS_VALUES: readonly AgentAccess[] = ['off', 'read-only', 'read-write']

export const MCP_SERVER_PATH = path.resolve(import.meta.dirname, '..', 'mcp', 'orca-db-mcp.mjs')

type Settings = DbServiceSettings & { agentAccess: AgentAccess; claudeMcp: boolean }

function integer(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

function readSettings(raw: unknown): Settings {
  const settings = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const access = settings.agentAccess
  return {
    queryTimeoutMs: integer(settings.queryTimeoutMs, DEFAULT_SETTINGS.queryTimeoutMs),
    maxRows: integer(settings.maxRows, DEFAULT_SETTINGS.maxRows),
    connectTimeoutMs: DEFAULT_SETTINGS.connectTimeoutMs,
    agentAccess: (AGENT_ACCESS_VALUES as readonly unknown[]).includes(access) ? (access as AgentAccess) : 'read-only',
    claudeMcp: settings.claudeMcp !== false
  }
}

let gateway: Gateway | null = null
let gatewayError: string | null = null
let mcpConfigPath: string | null = null

function writeClaudeMcpConfig(url: string, token: string): string {
  const dir = path.join(tmpdir(), 'orca-db-connector')
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const file = path.join(dir, `mcp-${process.pid}.json`)
  const config = claudeMcpConfig({ gatewayUrl: url, token, mcpServerPath: MCP_SERVER_PATH }, process.execPath)
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  return file
}

export default async function activate(orca: OrcaWorkerApi): Promise<void> {
  const store = new ConnectionStore(orca)

  // Settings are cached so the launch hook decides without an awaited host call.
  let settings = readSettings(await orca.settings.get())
  orca.settings.onDidChange(() => {
    void orca.settings.get().then((raw) => {
      settings = readSettings(raw)
    })
  })

  const service = new DbService({
    getConnection: (id) => store.get(id),
    password: (id) => store.password(id),
    settings: async () => settings,
    log: (message) => orca.log(message)
  })

  const announce = async (): Promise<void> => {
    orca.panels.post('connections.changed', { count: (await store.list()).length })
  }

  // Panel requests.
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
  orca.panels.handle('connections.test', ({ id }) => service.test(id))
  orca.panels.handle('schema.list', async ({ id }) => ({ tables: await service.schema(id) }))
  orca.panels.handle('query.run', ({ id, sql, allowWrites }, { signal }) =>
    service.query(id, sql, allowWrites === true ? 'read-write' : 'read-only', { signal })
  )
  orca.panels.handle(
    'gateway.status',
    async (): Promise<GatewayStatus> => ({
      running: gateway !== null,
      url: gateway?.url ?? null,
      agentAccess: settings.agentAccess,
      mcpServerPath: MCP_SERVER_PATH,
      error: gatewayError
    })
  )

  // The agent gateway: loopback HTTP with a per-start token.
  try {
    gateway = await startGateway({
      service,
      listConnections: () => store.list(),
      agentAccess: async () => settings.agentAccess,
      version: VERSION
    })
    gatewayError = null
    orca.log(`agent gateway listening on ${gateway.url} (${settings.agentAccess})`)
    try {
      mcpConfigPath = writeClaudeMcpConfig(gateway.url, gateway.token)
    } catch (error) {
      orca.log(`could not write the Claude Code MCP config: ${errorMessage(error)}`)
    }
  } catch (error) {
    gatewayError = errorMessage(error)
    orca.log(`agent gateway failed to start: ${gatewayError}`)
  }

  // Every agent Orca launches gets the gateway in its environment (and Claude Code its MCP config).
  orca.hooks.on('agent.launch.before', (event, next) => {
    if (gateway === null || settings.agentAccess === 'off') {
      return next()
    }
    const launch = event as AgentLaunchEvent
    if (typeof launch.command !== 'string' || typeof launch.agent !== 'string') {
      return next()
    }
    return next(
      decorateAgentLaunch(
        { ...launch, env: launch.env ?? {} },
        {
          gatewayUrl: gateway.url,
          token: gateway.token,
          mcpServerPath: MCP_SERVER_PATH,
          claudeMcpConfigPath: settings.claudeMcp ? mcpConfigPath : null
        }
      )
    )
  })

  orca.log(`DB Connector ${VERSION} ready`)
}

export async function deactivate(): Promise<void> {
  if (gateway !== null) {
    await gateway.close()
    gateway = null
  }
  if (mcpConfigPath !== null) {
    rmSync(mcpConfigPath, { force: true })
    mcpConfigPath = null
  }
}
