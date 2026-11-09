// The message typed into a running agent's terminal so an agent started before the plugin (or
// before this worker) can use the gateway. Agents read English; it stays short and concrete.

export type ConnectTextInput = {
  gatewayUrl: string
  token: string
  mcpServerPath: string
  /** Orca's agent id, when known. */
  agent: string | null
  /** What agents may do right now. */
  access: 'read-only' | 'read-write'
}

export function agentConnectText(input: ConnectTextInput): string {
  const auth = `-H "Authorization: Bearer ${input.token}"${input.agent ? ` -H "x-orca-agent: ${input.agent}"` : ''}`
  const writes =
    input.access === 'read-write'
      ? 'A write statement runs inside a transaction and waits until I approve it in Orca; it may be refused, so never retry a refused write.'
      : 'Only read statements are allowed right now.'
  return [
    `[Orca DB Connector] You can query the databases I saved in Orca through a local HTTP gateway at ${input.gatewayUrl} (this machine only).`,
    `Use curl with ${auth}:`,
    `  list connections:  curl -s ${auth} ${input.gatewayUrl}/connections`,
    `  describe schema:   curl -s ${auth} ${input.gatewayUrl}/connections/<id>/schema`,
    `  run SQL:           curl -s ${auth} -H "content-type: application/json" -d '{"sql":"SELECT ...","maxRows":50}' ${input.gatewayUrl}/connections/<id>/query`,
    `Reads run at once. ${writes} Connections marked dangerous need extra care. The same tools exist as an MCP server at ${input.mcpServerPath} (env ORCA_DB_GATEWAY_URL and ORCA_DB_GATEWAY_TOKEN) if you can load one.`,
    'Reply with one line confirming you can reach it, then wait for my instructions.'
  ].join('\n')
}
