// What the `agent.launch.before` hook adds to every agent Orca starts: the gateway's URL and
// token as environment variables, the path of the MCP server, and, for Claude Code, an
// `--mcp-config` argument so the `orca-db` tools are there without any setup.

export type AgentLaunchEvent = {
  agent: string
  command: string
  env: Record<string, string>
  [key: string]: unknown
}

export type AgentLaunchDeps = {
  gatewayUrl: string
  token: string
  /** Absolute path of mcp/orca-db-mcp.mjs. */
  mcpServerPath: string
  /** Absolute path of the MCP config file for Claude Code, written by the worker; null to skip. */
  claudeMcpConfigPath: string | null
}

export const ENV_GATEWAY_URL = 'ORCA_DB_GATEWAY_URL'
export const ENV_GATEWAY_TOKEN = 'ORCA_DB_GATEWAY_TOKEN'
export const ENV_MCP_SERVER = 'ORCA_DB_MCP_SERVER'
export const ENV_AGENT = 'ORCA_DB_AGENT'

/** Orca agent ids whose CLI is Claude Code (accepts `--mcp-config`). */
export function isClaudeCodeAgent(agent: string): boolean {
  return agent === 'claude' || agent === 'claude-agent-teams'
}

/** The MCP server definition agents register, as Claude Code, Codex and Gemini read it. */
export function mcpServerDefinition(deps: Pick<AgentLaunchDeps, 'gatewayUrl' | 'token' | 'mcpServerPath'>, execPath: string) {
  return {
    command: execPath,
    args: [deps.mcpServerPath],
    env: {
      // When execPath is Orca's own binary, this makes it run as plain Node; a real node ignores it.
      ELECTRON_RUN_AS_NODE: '1',
      [ENV_GATEWAY_URL]: deps.gatewayUrl,
      [ENV_GATEWAY_TOKEN]: deps.token,
      [ENV_AGENT]: 'claude'
    }
  }
}

export function claudeMcpConfig(deps: Pick<AgentLaunchDeps, 'gatewayUrl' | 'token' | 'mcpServerPath'>, execPath: string) {
  return { mcpServers: { 'orca-db': mcpServerDefinition(deps, execPath) } }
}

function quoteArg(value: string): string {
  return /^[A-Za-z0-9_./:\\-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`
}

export function decorateAgentLaunch(event: AgentLaunchEvent, deps: AgentLaunchDeps): AgentLaunchEvent {
  const env = {
    ...event.env,
    [ENV_GATEWAY_URL]: deps.gatewayUrl,
    [ENV_GATEWAY_TOKEN]: deps.token,
    [ENV_MCP_SERVER]: deps.mcpServerPath,
    [ENV_AGENT]: event.agent
  }
  let command = event.command
  if (deps.claudeMcpConfigPath !== null && isClaudeCodeAgent(event.agent) && !/--mcp-config\b/.test(command)) {
    command = `${command} --mcp-config ${quoteArg(deps.claudeMcpConfigPath)}`
  }
  return { ...event, command, env }
}
