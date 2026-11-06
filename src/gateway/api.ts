// The HTTP API agents reach (through the MCP server or curl). Pure request -> response, so it
// is testable without sockets; src/gateway/server.ts puts it behind node:http.
import { errorMessage, hostError, type HostError } from '../errors.ts'
import type { AgentAccess, DbConnection } from '../protocol.ts'
import type { DbService } from '../db/service.ts'

export type GatewayRequest = {
  method: string
  /** Path and query, such as `/connections/local/query`. */
  path: string
  body: unknown
}

export type GatewayResponse = { status: number; body: unknown }

export type GatewayDeps = {
  service: DbService
  listConnections(): Promise<DbConnection[]>
  agentAccess(): Promise<AgentAccess>
  version: string
}

const STATUS_BY_CODE: Record<string, number> = {
  invalid_params: 400,
  not_permitted: 403,
  unavailable: 503,
  timeout: 504,
  conflict: 409,
  action_failed: 500
}

function errorResponse(error: unknown): GatewayResponse {
  const code = (error as Partial<HostError>)?.code ?? 'action_failed'
  return {
    status: STATUS_BY_CODE[code] ?? 500,
    body: { error: { code, message: errorMessage(error) } }
  }
}

function publicConnection(connection: DbConnection) {
  const { id, name, driver, host, port, database, user } = connection
  return { id, name, driver, host, port, database, user }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function handleGatewayRequest(request: GatewayRequest, deps: GatewayDeps): Promise<GatewayResponse> {
  try {
    const path = request.path.split('?')[0] ?? '/'
    const parts = path.split('/').filter((part) => part !== '').map(decodeURIComponent)
    const method = request.method.toUpperCase()

    if (method === 'GET' && parts.length === 1 && parts[0] === 'health') {
      return { status: 200, body: { ok: true, version: deps.version, agentAccess: await deps.agentAccess() } }
    }

    const access = await deps.agentAccess()
    if (access === 'off') {
      throw hostError('not_permitted', 'agent access is turned off in the DB Connector settings')
    }

    if (method === 'GET' && parts.length === 1 && parts[0] === 'connections') {
      const connections = (await deps.listConnections()).filter((connection) => connection.agent)
      return { status: 200, body: { connections: connections.map(publicConnection) } }
    }

    if (parts[0] === 'connections' && parts.length === 3) {
      const id = parts[1] ?? ''
      const exposed = (await deps.listConnections()).find((connection) => connection.id === id && connection.agent)
      if (exposed === undefined) {
        throw hostError('invalid_params', `unknown connection: ${id}`)
      }
      if (method === 'GET' && parts[2] === 'schema') {
        return { status: 200, body: { tables: await deps.service.schema(id) } }
      }
      if (method === 'POST' && parts[2] === 'query') {
        if (!isRecord(request.body) || typeof request.body.sql !== 'string') {
          throw hostError('invalid_params', 'body must be {"sql": "..."}')
        }
        const maxRows = typeof request.body.maxRows === 'number' ? request.body.maxRows : undefined
        const result = await deps.service.query(id, request.body.sql, access, { maxRows })
        return { status: 200, body: result }
      }
    }

    return { status: 404, body: { error: { code: 'not_found', message: `no route ${method} ${path}` } } }
  } catch (error) {
    return errorResponse(error)
  }
}
