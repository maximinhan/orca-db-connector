# Agent access

[한국어](agent-access.ko.md)

How the agents Orca launches (Claude Code, Codex, Gemini CLI and the rest) connect to, inspect
and query the databases saved in DB Connector.

## How it works

```
Orca ──starts──▶ plugin worker (src/worker.ts)
                   ├─ gateway  http://127.0.0.1:<port>   bearer token, new on every worker start
                   └─ hook     agent.launch.before      adds env (+ --mcp-config for Claude Code)
                                      │
Orca ──launches──▶ agent CLI ◀────────┘ env: ORCA_DB_GATEWAY_URL, ORCA_DB_GATEWAY_TOKEN, ORCA_DB_MCP_SERVER
                     └─ runs mcp/orca-db-mcp.mjs (stdio MCP) ──HTTP──▶ gateway ──▶ src/db/service.ts ──▶ database
```

1. When the plugin is enabled, Orca starts its worker and keeps it running (the manifest lists a
   hook). The worker opens a loopback-only HTTP gateway and generates a random bearer token.
2. Every time Orca launches an agent in a terminal, the `agent.launch.before` hook adds three
   environment variables to that agent, and for Claude Code (`claude`, `claude-agent-teams`) also
   appends `--mcp-config <file>` to the command. The file names the MCP server and the token.
3. The MCP server (`mcp/orca-db-mcp.mjs`) is plain Node with no dependencies. It reads the two
   environment variables and turns tool calls into gateway requests.
4. The gateway checks the token and the **Agent access** setting, then runs the request through
   the same `DbService` the panel uses. In read-only mode the SQL is classified first and the
   database session is opened read-only (`PRAGMA`/`readOnly` for SQLite,
   `default_transaction_read_only` for PostgreSQL, `TRANSACTION READ ONLY` for MySQL), so the
   server itself refuses writes.

## Tools agents get

| Tool | Arguments | Answer |
| --- | --- | --- |
| `list_connections` | none | `{ connections: [{ id, name, driver, host, port, database, user }] }` (only connections with **Expose to agents** on; never a password) |
| `describe_schema` | `connection` | `{ tables: [{ schema, name, kind, columns: [{ name, type, nullable, primaryKey }] }] }` |
| `run_query` | `connection`, `sql`, `max_rows?` | `{ columns, rows, rowCount, truncated, durationMs, message? }` |

The MCP server's `instructions` tell the agent to call them in that order. Results come back as
JSON text and as `structuredContent`.

## Claude Code

Nothing to do: with **Add the MCP server to Claude Code** on (the default), every Claude Code
launch from Orca gets `--mcp-config` pointing at a file the worker wrote. Run `/mcp` inside
Claude Code to see `orca-db` and its three tools. If you launched Claude Code with your own
`--mcp-config`, the plugin leaves the command alone and you can add the server yourself (below).

## Other agents

Every agent gets the environment variables, so register the MCP server once with a command that
inherits them. The token changes when the worker restarts, so never copy it into a config file;
let the server read it from the environment at run time.

```sh
# Codex CLI
codex mcp add orca-db -- node "$ORCA_DB_MCP_SERVER"

# Gemini CLI
gemini mcp add orca-db node "$ORCA_DB_MCP_SERVER"

# Any MCP client that takes a JSON definition
{ "mcpServers": { "orca-db": { "command": "node", "args": ["<value of ORCA_DB_MCP_SERVER>"] } } }
```

An agent without MCP can call the gateway directly:

```sh
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" "$ORCA_DB_GATEWAY_URL/connections"
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" "$ORCA_DB_GATEWAY_URL/connections/<id>/schema"
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" -H 'content-type: application/json' \
  -d '{"sql":"SELECT * FROM users LIMIT 10","maxRows":10}' "$ORCA_DB_GATEWAY_URL/connections/<id>/query"
```

| Route | Answer |
| --- | --- |
| `GET /health` | `{ ok, version, agentAccess }` (works even when access is off) |
| `GET /connections` | as `list_connections` |
| `GET /connections/<id>/schema` | as `describe_schema` |
| `POST /connections/<id>/query` `{ sql, maxRows? }` | as `run_query` |

Errors are `{ error: { code, message } }` with `401` (token), `400` (`invalid_params`), `403`
(`not_permitted`: access off, or a write in read-only mode), `503` (`unavailable`: a driver did
not load), `500` (the database's own error message).

## Security model

- **Loopback only.** The gateway listens on `127.0.0.1` and never on a network interface.
- **One token per worker start**, 256 random bits, compared in constant time. It reaches agents
  only through the environment Orca gives them and the Claude Code config file, written with mode
  `0600` under the system temp directory and removed when the worker stops.
- **Read-only by default**, enforced twice: `classifySql` refuses anything but `SELECT`, `WITH`,
  `SHOW`, `EXPLAIN`, `DESCRIBE` and `PRAGMA` (and a `WITH … INSERT`, `SELECT … INTO` or
  `PRAGMA x = y`), then the session itself is read-only at the server. Set **Agent access** to
  `read-write` only when you mean it; `off` makes the hook a no-op and the gateway answer `403`.
- **Per-connection switch.** A connection with **Expose to agents** off is invisible to the
  gateway, whatever the global setting.
- **No passwords leave the worker.** Agents see connection ids, hosts and user names, never the
  password; the worker reads it from Orca's secrets only to open the session.
- **Row and time caps.** `Max rows per query` bounds every answer (agents may ask for fewer), and
  `Query timeout` is a server-side statement timeout for PostgreSQL and MySQL. SQLite queries run
  synchronously in the worker and have no timeout.
- **Writes are the user's call.** With `read-write`, agents run exactly what they send; the
  plugin adds no transaction or confirmation.

## Limits and notes

- The hook runs only for launches Orca makes (new tab, workspace create, orchestration, CLI).
  Restores and resumes of saved sessions are not hooked, so an agent restored after an Orca
  restart has stale values: start a new agent.
- A worker restart (a save while developing, **Restart** on the plugin row, or Orca stopping an
  idle worker) changes the token; agents started before it get `401` until relaunched.
- `agent.launch.before` is a Claude Code `--mcp-config` injection only; Orca's reserved
  `contributes.mcpServers` point will replace it when its format ships.
- Browser clients (`orca serve`) have no plugin workers; the gateway exists only in the desktop app.
