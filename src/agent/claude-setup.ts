// Registers the orca-db MCP server in Claude Code's user settings, so every Claude Code session
// on this machine has the tools, however it was started. The server finds the gateway through
// the discovery file, so the registration carries no token and survives worker restarts.
import { execFile } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import type { ClaudeSetupResult } from '../protocol.ts'

export const MCP_SERVER_NAME = 'orca-db'

export type ClaudeSetupInput = {
  mcpServerPath: string
  /** The Node (or Orca binary run as Node) that starts the MCP server. */
  execPath: string
  env?: NodeJS.ProcessEnv
  home?: string
  timeoutMs?: number
}

/** The `claude mcp add` arguments, shared by the command we run and the one we print. */
export function claudeMcpAddArgs(input: Pick<ClaudeSetupInput, 'mcpServerPath' | 'execPath'>): string[] {
  // `--env` is variadic and would swallow the server name, so the name comes first and `--` ends the option.
  return ['mcp', 'add', '--scope', 'user', '--transport', 'stdio', MCP_SERVER_NAME, '--env', 'ELECTRON_RUN_AS_NODE=1', '--', input.execPath, input.mcpServerPath]
}

function quote(value: string): string {
  return /^[A-Za-z0-9_./:=@-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`
}

export function claudeMcpAddCommand(input: Pick<ClaudeSetupInput, 'mcpServerPath' | 'execPath'>): string {
  return ['claude', ...claudeMcpAddArgs(input)].map(quote).join(' ')
}

/** Finds the `claude` CLI: on PATH, then where its installers usually put it. */
export function findClaudeCli(env: NodeJS.ProcessEnv = process.env, home = homedir()): string | null {
  const names = process.platform === 'win32' ? ['claude.cmd', 'claude.exe', 'claude'] : ['claude']
  const dirs = [
    ...(env.PATH ?? '').split(path.delimiter).filter(Boolean),
    path.join(home, '.claude', 'local'),
    path.join(home, '.local', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, '.volta', 'bin'),
    path.join(home, '.bun', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin'
  ]
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name)
      try {
        accessSync(candidate, constants.X_OK)
        return candidate
      } catch {
        // keep looking
      }
    }
  }
  return null
}

export async function registerClaudeMcpServer(input: ClaudeSetupInput): Promise<ClaudeSetupResult> {
  const command = claudeMcpAddCommand(input)
  const cli = findClaudeCli(input.env, input.home)
  if (cli === null) {
    return { ok: false, message: 'The claude CLI was not found on this machine. Run the command below in a terminal.', command }
  }
  return new Promise((resolve) => {
    execFile(
      cli,
      claudeMcpAddArgs(input),
      { timeout: input.timeoutMs ?? 30_000, windowsHide: true, env: input.env ?? process.env },
      (error, stdout, stderr) => {
        const output = `${stdout}\n${stderr}`.trim()
        if (error) {
          // An existing entry is not a failure for us: the server is registered.
          if (/already exists/i.test(output)) {
            resolve({ ok: true, message: `${MCP_SERVER_NAME} is already registered in Claude Code (user scope).`, command })
            return
          }
          resolve({ ok: false, message: output || error.message, command })
          return
        }
        resolve({ ok: true, message: output || `${MCP_SERVER_NAME} registered in Claude Code (user scope).`, command })
      }
    )
  })
}
