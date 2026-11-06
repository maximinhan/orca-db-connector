// Spawns the MCP server against a gateway running in this process over a temporary SQLite file.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DbService, DEFAULT_SETTINGS } from '../src/db/service.ts'
import { sqliteDriver } from '../src/drivers/sqlite.ts'
import { startGateway } from '../src/gateway/server.ts'
import { handleMessage, TOOLS } from './orca-db-mcp.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = mkdtempSync(path.join(tmpdir(), 'orca-db-mcp-'))
const connection = { id: 'local', name: 'Local', driver: 'sqlite', host: '', port: 0, database: path.join(dir, 'a.db'), user: '', agent: true }
let gateway

before(async () => {
  const client = await sqliteDriver.connect(connection, null, { readOnly: false, connectTimeoutMs: 1000, queryTimeoutMs: 1000 })
  await client.query('CREATE TABLE t (n INTEGER PRIMARY KEY, s TEXT)', { maxRows: 1 })
  await client.query("INSERT INTO t VALUES (1, 'a'), (2, 'b')", { maxRows: 1 })
  await client.close()
  gateway = await startGateway({
    service: new DbService({
      getConnection: async (id) => (id === 'local' ? connection : null),
      password: async () => null,
      settings: async () => DEFAULT_SETTINGS
    }),
    listConnections: async () => [connection],
    agentAccess: async () => 'read-only',
    version: 'test'
  })
})

after(async () => {
  await gateway.close()
  rmSync(dir, { recursive: true, force: true })
})

function startServer() {
  const child = spawn(process.execPath, [path.join(here, 'orca-db-mcp.mjs')], {
    env: { ...process.env, ORCA_DB_GATEWAY_URL: gateway.url, ORCA_DB_GATEWAY_TOKEN: gateway.token },
    stdio: ['pipe', 'pipe', 'inherit']
  })
  const lines = createInterface({ input: child.stdout })
  const pending = new Map()
  lines.on('line', (line) => {
    const message = JSON.parse(line)
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  })
  let nextId = 1
  return {
    request(method, params) {
      const id = nextId++
      return new Promise((resolve) => {
        pending.set(id, resolve)
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
      })
    },
    notify(method, params) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
    },
    close() {
      child.stdin.end()
      return new Promise((resolve) => child.once('exit', resolve))
    }
  }
}

test('initialize, list tools, call tools over stdio', async () => {
  const server = startServer()
  const init = await server.request('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } })
  assert.equal(init.result.protocolVersion, '2025-03-26')
  assert.equal(init.result.serverInfo.name, 'orca-db-connector')
  server.notify('notifications/initialized')

  const tools = await server.request('tools/list')
  assert.deepEqual(tools.result.tools.map((tool) => tool.name), ['list_connections', 'describe_schema', 'run_query'])

  const list = await server.request('tools/call', { name: 'list_connections', arguments: {} })
  assert.equal(list.result.structuredContent.connections[0].id, 'local')

  const schema = await server.request('tools/call', { name: 'describe_schema', arguments: { connection: 'local' } })
  assert.equal(schema.result.structuredContent.tables[0].name, 't')

  const query = await server.request('tools/call', { name: 'run_query', arguments: { connection: 'local', sql: 'SELECT * FROM t ORDER BY n', max_rows: 1 } })
  assert.deepEqual(query.result.structuredContent.rows, [{ n: 1, s: 'a' }])
  assert.equal(query.result.structuredContent.truncated, true)
  assert.match(query.result.content[0].text, /"n": 1/)

  const refused = await server.request('tools/call', { name: 'run_query', arguments: { connection: 'local', sql: 'DELETE FROM t' } })
  assert.equal(refused.result.isError, true)
  assert.match(refused.result.content[0].text, /not_permitted/)

  const unknown = await server.request('nope')
  assert.equal(unknown.error.code, -32601)
  assert.equal((await server.request('ping')).result !== undefined, true)
  const exit = await server.close()
  assert.equal(exit, 0)
})

test('handleMessage validates requests and tool arguments', async () => {
  const call = async () => ({ ok: true })
  assert.equal(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, call), null)
  assert.equal((await handleMessage({ foo: 1 }, call)).error.code, -32600)
  const missing = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'run_query', arguments: { connection: 'x' } } }, call)
  assert.equal(missing.result.isError, true)
  assert.match(missing.result.content[0].text, /sql is required/)
  assert.equal(TOOLS.length, 3)
})

test('fails fast without the gateway env', async () => {
  const child = spawn(process.execPath, [path.join(here, 'orca-db-mcp.mjs')], {
    env: { PATH: process.env.PATH },
    stdio: ['pipe', 'pipe', 'pipe']
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const code = await new Promise((resolve) => child.once('exit', resolve))
  assert.equal(code, 1)
  assert.match(stderr, /ORCA_DB_GATEWAY_URL/)
})
