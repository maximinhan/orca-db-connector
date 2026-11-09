// Where the MCP server finds the gateway when its environment says nothing: a small JSON file
// the worker writes at start and removes at stop. Agents started before the plugin, or before a
// worker restart changed the token, read it instead of ORCA_DB_GATEWAY_URL/TOKEN.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

export type GatewayDiscovery = {
  url: string
  token: string
  /** ms since the epoch when this worker started the gateway. */
  startedAt: number
  mcpServerPath: string
}

export function defaultDiscoveryPath(home = homedir()): string {
  return path.join(home, '.orca-db-connector', 'gateway.json')
}

/** Writes the file readable by this user only. */
export function writeDiscoveryFile(file: string, discovery: GatewayDiscovery): void {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, `${JSON.stringify(discovery, null, 2)}\n`, { mode: 0o600 })
}

export function removeDiscoveryFile(file: string): void {
  rmSync(file, { force: true })
}
