// The plugin's own worker (`main` in orca-plugin.json). Because the manifest lists a hook, Orca
// starts it when the plugin is enabled and keeps it running, so the agent gateway stays up.
// Orca transpiles this file when it loads: no build step. A restart drops in-memory state, so
// everything that must last is in orca.storage / orca.secrets.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { OrcaWorkerApi } from 'orca/worker'
import { registerClaudeMcpServer } from './agent/claude-setup.ts'
import { defaultDiscoveryPath, removeDiscoveryFile, writeDiscoveryFile } from './agent/discovery.ts'
import { claudeMcpConfig, decorateAgentLaunch, type AgentLaunchEvent } from './agent/launch-hook.ts'
import { ApprovalQueue } from './approvals/queue.ts'
import { SecretsManager } from './aws/secrets-manager.ts'
import { ConnectionStore, validateConnection } from './connections.ts'
import { DbService, DEFAULT_SETTINGS, type DbServiceSettings } from './db/service.ts'
import { errorMessage } from './errors.ts'
import { startGateway, type Gateway } from './gateway/server.ts'
import { QueryLog } from './log/query-log.ts'
import type { AgentAccess, GatewayStatus } from './protocol.ts'

const VERSION = '0.6.0'
const AGENT_ACCESS_VALUES: readonly AgentAccess[] = ['off', 'read-only', 'read-write']
const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000

export const MCP_SERVER_PATH = path.resolve(import.meta.dirname, '..', 'mcp', 'orca-db-mcp.mjs')
/** Overridable so tests never touch the real home directory. */
export const DISCOVERY_PATH = process.env.ORCA_DB_DISCOVERY_FILE || defaultDiscoveryPath()

type Settings = DbServiceSettings & { claudeMcp: boolean; approvalTimeoutMs: number }

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
    claudeMcp: settings.claudeMcp !== false,
    approvalTimeoutMs: integer(settings.approvalTimeoutMs, DEFAULT_APPROVAL_TIMEOUT_MS)
  }
}

let gateway: Gateway | null = null
let gatewayError: string | null = null
let mcpConfigPath: string | null = null
let approvals: ApprovalQueue | null = null
let log: QueryLog | null = null

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

  // The panel reports Orca's UI language; until then notifications are English.
  let korean = false

  const queue = new ApprovalQueue({
    get timeoutMs() {
      return settings.approvalTimeoutMs
    },
    onChange: (requests) => orca.panels.post('approvals.changed', { count: requests.length }),
    onRequest: (request) => {
      if (!orca.grantedCapabilities.includes('notifications:show')) {
        return
      }
      const where = request.environment ? `${request.connectionName} (${request.environment})` : request.connectionName
      const agent = request.agent ?? (korean ? '에이전트' : 'An agent')
      const sql = request.sql.slice(0, 120)
      void orca.host
        .call(
          'notifications.show',
          korean
            ? {
                title: `${agent}이(가) ${where}에 쓰기를 요청합니다`,
                body: `${request.dangerous ? '위험 환경입니다. ' : ''}DB Connector 패널에서 승인하거나 거부하세요: ${sql}`
              }
            : {
                title: `${agent} wants to write to ${where}`,
                body: `${request.dangerous ? 'DANGEROUS environment. ' : ''}Open the DB Connector panel to approve or refuse: ${sql}`
              }
        )
        .catch((error: unknown) => orca.log(`notification failed: ${errorMessage(error)}`))
    }
  })
  approvals = queue

  const queryLog = new QueryLog({
    store: orca.storage,
    onChange: (entries) => orca.panels.post('log.changed', { count: entries.length })
  })
  await queryLog.load()
  log = queryLog

  const secrets = new SecretsManager()
  const service = new DbService({
    getConnection: (id) => store.get(id),
    password: (id) => store.password(id),
    settings: async () => settings,
    approvals: queue,
    log: queryLog,
    secrets,
    trace: (message) => orca.log(message)
  })

  const announce = async (): Promise<void> => {
    orca.panels.post('connections.changed', { count: (await store.list()).length })
  }

  // Panel requests.
  orca.panels.handle('connections.list', async () => ({ connections: await store.list() }))
  orca.panels.handle('connections.save', async ({ connection, password }) => {
    const saved = await store.save(validateConnection(connection), password)
    secrets.forget()
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
  orca.panels.handle('query.run', ({ id, sql, allowWrites, confirmed }, { signal }) =>
    service.query({ id, sql, source: 'panel', allowWrites: allowWrites === true, confirmed: confirmed === true, signal })
  )
  orca.panels.handle(
    'gateway.status',
    async (): Promise<GatewayStatus> => ({
      running: gateway !== null,
      url: gateway?.url ?? null,
      agentAccess: settings.agentAccess,
      mcpServerPath: MCP_SERVER_PATH,
      discoveryPath: DISCOVERY_PATH,
      error: gatewayError
    })
  )
  orca.panels.handle('approvals.list', async () => ({ approvals: queue.list() }))
  orca.panels.handle('approvals.decide', async ({ id, approve }) => ({ decided: queue.decide(id, approve === true) }))
  orca.panels.handle('log.list', async () => ({ entries: queryLog.list() }))
  orca.panels.handle('log.result', async ({ id }) => ({ result: queryLog.result(id) }))
  orca.panels.handle('log.clear', async () => ({ cleared: queryLog.clear() }))
  orca.panels.handle('ui.hello', async ({ locale }) => {
    korean = typeof locale === 'string' && /^ko(?:[-_]|$)/i.test(locale)
    return { ok: true as const }
  })

  // Registers the MCP server in Claude Code's user settings, for sessions the launch hook never saw.
  orca.panels.handle('claude.setup', () =>
    registerClaudeMcpServer({ mcpServerPath: MCP_SERVER_PATH, execPath: process.execPath })
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
    try {
      writeDiscoveryFile(DISCOVERY_PATH, { url: gateway.url, token: gateway.token, startedAt: Date.now(), mcpServerPath: MCP_SERVER_PATH })
    } catch (error) {
      orca.log(`could not write the gateway discovery file: ${errorMessage(error)}`)
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
  approvals?.dispose()
  approvals = null
  if (gateway !== null) {
    await gateway.close()
    gateway = null
  }
  if (mcpConfigPath !== null) {
    rmSync(mcpConfigPath, { force: true })
    mcpConfigPath = null
  }
  removeDiscoveryFile(DISCOVERY_PATH)
  await log?.flush()
  log = null
}
