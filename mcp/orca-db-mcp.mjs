#!/usr/bin/env node
// A stdio MCP server that gives an agent three tools over the DB Connector gateway:
// list_connections, describe_schema and run_query. It needs ORCA_DB_GATEWAY_URL and
// ORCA_DB_GATEWAY_TOKEN, which the plugin sets on every agent Orca launches. Plain Node, no
// dependencies: JSON-RPC 2.0 messages, one per line, on stdin and stdout.
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'

export const SERVER_INFO = { name: 'orca-db-connector', version: '0.3.0' }
const PROTOCOL_VERSION = '2025-06-18'

export const TOOLS = [
  {
    name: 'list_connections',
    description:
      'Lists the database connections saved in Orca DB Connector that agents may use. Each has an id to pass to describe_schema and run_query, an environment label, whether it is marked dangerous, and agentWrites: "always" (writes run at once) or "ask" (the person approves each write in Orca).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'describe_schema',
    description: 'Lists the tables and views of a connection with their columns, types, nullability and primary keys.',
    inputSchema: {
      type: 'object',
      properties: { connection: { type: 'string', description: 'Connection id from list_connections' } },
      required: ['connection'],
      additionalProperties: false
    }
  },
  {
    name: 'run_query',
    description:
      'Runs SQL on a connection and returns columns and rows as JSON. Read statements (SELECT, WITH, SHOW, EXPLAIN, DESCRIBE, PRAGMA) run in a read-only session. A write runs inside a transaction and, unless the connection allows agent writes at once, waits until the person approves it in Orca (this call blocks, possibly for minutes, and fails with not_permitted or timeout when refused). Rows are capped by max_rows and the plugin setting; the result says when it was truncated.',
    inputSchema: {
      type: 'object',
      properties: {
        connection: { type: 'string', description: 'Connection id from list_connections' },
        sql: { type: 'string', description: 'The SQL to run' },
        max_rows: { type: 'integer', minimum: 1, description: 'Return at most this many rows' }
      },
      required: ['connection', 'sql'],
      additionalProperties: false
    }
  }
]

export function createGatewayClient(env = process.env, fetchImpl = fetch) {
  const url = env.ORCA_DB_GATEWAY_URL
  const token = env.ORCA_DB_GATEWAY_TOKEN
  const agent = env.ORCA_DB_AGENT
  if (!url || !token) {
    throw new Error('ORCA_DB_GATEWAY_URL and ORCA_DB_GATEWAY_TOKEN are not set: start this agent from Orca with the DB Connector plugin enabled')
  }
  return async function call(method, route, body) {
    const response = await fetchImpl(`${url.replace(/\/$/, '')}${route}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(agent ? { 'x-orca-agent': agent } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    const text = await response.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`gateway answered ${response.status}: ${text.slice(0, 200)}`)
    }
    if (!response.ok) {
      const error = json?.error ?? {}
      throw new Error(`${error.code ?? response.status}: ${error.message ?? text}`)
    }
    return json
  }
}

export async function callTool(call, name, args = {}) {
  switch (name) {
    case 'list_connections':
      return call('GET', '/connections')
    case 'describe_schema':
      requireString(args, 'connection')
      return call('GET', `/connections/${encodeURIComponent(args.connection)}/schema`)
    case 'run_query': {
      requireString(args, 'connection')
      requireString(args, 'sql')
      const body = { sql: args.sql }
      if (Number.isInteger(args.max_rows) && args.max_rows > 0) {
        body.maxRows = args.max_rows
      }
      return call('POST', `/connections/${encodeURIComponent(args.connection)}/query`, body)
    }
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}

function requireString(args, key) {
  if (typeof args?.[key] !== 'string' || args[key] === '') {
    throw new Error(`${key} is required`)
  }
}

/** Answers one JSON-RPC request; null for a notification (no answer). */
export async function handleMessage(message, call) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'invalid request' } }
  }
  const { id, method, params } = message
  if (typeof method !== 'string') {
    return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'invalid request' } }
  }
  if (id === undefined) {
    return null // notifications such as notifications/initialized
  }
  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
            instructions:
              'Use list_connections first, then describe_schema to learn the tables, then run_query. Reads run at once. A write may wait for the person to approve it in Orca; tell them what you are about to change and why before you send it, and never retry a refused write.'
          }
        }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
      case 'tools/call': {
        const name = params?.name
        try {
          const result = await callTool(call, name, params?.arguments ?? {})
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result } }
        } catch (error) {
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true } }
        }
      }
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } }
    }
  } catch (error) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } }
  }
}

export function serve(input = process.stdin, output = process.stdout, env = process.env) {
  const call = createGatewayClient(env)
  const lines = createInterface({ input, crlfDelay: Infinity })
  let chain = Promise.resolve()
  lines.on('line', (line) => {
    if (line.trim() === '') {
      return
    }
    let message
    try {
      message = JSON.parse(line)
    } catch {
      output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })}\n`)
      return
    }
    chain = chain.then(async () => {
      const answer = await handleMessage(message, call)
      if (answer !== null) {
        output.write(`${JSON.stringify(answer)}\n`)
      }
    })
  })
  return new Promise((resolve) => lines.on('close', () => chain.then(resolve)))
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  if (process.argv.includes('--help')) {
    process.stdout.write(
      `orca-db-mcp: MCP server (stdio) for the Orca DB Connector plugin.\n` +
        `Needs ORCA_DB_GATEWAY_URL and ORCA_DB_GATEWAY_TOKEN, set by Orca on agents it launches.\n` +
        `Tools: ${TOOLS.map((tool) => tool.name).join(', ')}\n`
    )
    process.exit(0)
  }
  try {
    await serve()
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}
