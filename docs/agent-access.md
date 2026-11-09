# Agent access

[한국어](agent-access.ko.md)

How the agents Orca launches (Claude Code, Codex, Gemini CLI and the rest) connect to, inspect
and query the databases saved in DB Connector, how their writes are approved, and how every
query is logged.

## How it works

```
Orca ──starts──▶ plugin worker (src/worker.ts)
                   ├─ gateway  http://127.0.0.1:<port>   bearer token, new on every worker start
                   ├─ hook     agent.launch.before      adds env (+ --mcp-config for Claude Code)
                   ├─ approval queue                    agent writes wait here for the panel
                   └─ query log                         every query, with the rows of recent ones
                                      │
Orca ──launches──▶ agent CLI ◀────────┘ env: ORCA_DB_GATEWAY_URL, ORCA_DB_GATEWAY_TOKEN, ORCA_DB_MCP_SERVER, ORCA_DB_AGENT
                     └─ runs mcp/orca-db-mcp.mjs (stdio MCP) ──HTTP──▶ gateway ──▶ src/db/service.ts ──▶ database
```

1. When the plugin is enabled, Orca starts its worker and keeps it running (the manifest lists a
   hook). The worker opens a loopback-only HTTP gateway and generates a random bearer token.
2. Every time Orca launches an agent in a terminal, the `agent.launch.before` hook adds four
   environment variables to that agent, and for Claude Code (`claude`, `claude-agent-teams`) also
   appends `--mcp-config <file>` to the command. The file names the MCP server and the token.
3. The MCP server (`mcp/orca-db-mcp.mjs`) is plain Node with no dependencies. It reads the
   environment variables and turns tool calls into gateway requests, naming the agent in an
   `x-orca-agent` header so the log says who asked.
4. The gateway checks the token and the **Agent access** setting, then runs the request through
   the same `DbService` the panel uses: reads in a read-only session, writes through the approval
   policy below and inside a transaction.

## Tools agents get

| Tool | Arguments | Answer |
| --- | --- | --- |
| `list_connections` | none | `{ connections: [{ id, name, driver, host, port, database, user, environment, dangerous, agentWrites, credentialSource }] }` (only connections with **Expose to agents** on; never a password) |
| `describe_schema` | `connection` | `{ tables: [{ schema, name, kind, columns: [{ name, type, nullable, primaryKey }] }] }` |
| `run_query` | `connection`, `sql`, `max_rows?` | `{ columns, rows, rowCount, truncated, durationMs, message? }` |

The MCP server's `instructions` tell the agent to call them in that order, to explain a write
before sending it, and never to retry a refused one. Results come back as JSON text and as
`structuredContent`.

## Reads, writes and approval

A statement is a **read** when it starts with `SELECT`, `WITH`, `SHOW`, `EXPLAIN`, `DESCRIBE`,
`PRAGMA`, `VALUES` or `TABLE` and contains no writing keyword outside strings and comments
(`src/sql/classify.ts`). Reads always run, in a session the server itself opened read-only.

Everything else is a **write**. What happens to an agent's write:

| Agent access (setting) | Connection | Outcome |
| --- | --- | --- |
| `off` | any | Gateway answers `403`; the hook adds nothing to agents |
| `read-only` (default) | any | `403 not_permitted`, logged as `denied` |
| `read-write` | **Always allow agent writes** on, not dangerous | Runs at once inside a transaction (`approval: auto`) |
| `read-write` | **Always allow agent writes** off | Waits for **Approve** / **Refuse** in the panel |
| `read-write` | **Dangerous environment** on | Always waits, whatever the write option says |

While a write waits, the `run_query` call blocks (Claude Code shows the tool as running), the
panel shows a card with the agent, the connection, its environment label and the SQL, and Orca
shows a desktop notification. **Approve** runs it (`approval: approved`), **Refuse** answers
`403 not_permitted` ("the write was refused in Orca"), and after the **Approval timeout**
setting (5 minutes by default) it answers `504 timeout`. If the agent gives up first (the MCP
call is cancelled, the socket closes), the request leaves the queue as refused.

Every write, approved or automatic, runs between `BEGIN` and `COMMIT` (`START TRANSACTION` on
MySQL) and is rolled back when any statement in it fails, so a two-statement script never half
applies. Statements that cannot run inside a transaction (PostgreSQL `VACUUM`, `CREATE
DATABASE`) fail with the server's message.

The panel's own console follows the same rules with its **Allow writes** checkbox; on a
dangerous connection a write needs a second press on **Run on <environment>**.

## Environment labels and dangerous connections

Each connection has a free-text **Environment label** (`local`, `dev`, `staging`, `prod`, …),
shown as a badge in the panel, in approval cards and in the log, and returned to agents by
`list_connections`.

**Dangerous environment** is a per-connection switch for the databases you must not change by
accident:

- agent writes always wait for approval, whatever **Always allow agent writes** says;
- the panel asks a second time before its own writes;
- the connection, its approval cards and every log entry for it are highlighted in the danger
  tone with a `DANGEROUS` badge, and `list_connections` reports `dangerous: true` so an agent
  can be careful too.

## The activity log

The **Activity** section lists the last 200 queries, newest first, from the panel and from
agents: who ran it (`panel`, or the agent id such as `claude`), the connection and its label,
read or write, the outcome (`ok`, `error`, `denied`, `timeout`), the rows returned or changed,
the duration, and whether the person approved it. Select an entry to see the full SQL, the
error, and the rows: the worker keeps the rows of the last 50 queries (capped by **Max rows per
query**), so recent results can be inspected without running them again. Entries persist in the
plugin's storage across restarts; rows do not. **Clear log** forgets both.

## Sessions the launch hook never saw

The hook runs only when Orca launches an agent, so a Claude Code started before the plugin was
enabled, started by hand in a terminal, or restored by Orca has no `ORCA_DB_*` variables. Two
pieces cover those:

- **Discovery file.** While the worker runs it keeps `~/.orca-db-connector/gateway.json` (mode
  `0600`) with the gateway URL and token. The MCP server reads it when its environment has no
  gateway, and re-reads it once after a `401`, so a worker restart that changed the token is
  followed without any reconfiguration.
- **User-scope registration.** **Register in Claude Code** in the panel runs
  `claude mcp add --scope user --env ELECTRON_RUN_AS_NODE=1 orca-db -- <orca binary> <mcp server>`,
  which puts the server in Claude Code's user settings: every Claude Code on the machine loads it,
  however it was started. The same command is printed for running by hand when the `claude` CLI is
  not on the worker's PATH.

A Claude Code session that is already open does not load new MCP servers: run `/exit` and then
`claude --continue` (or `--resume`) in the same terminal to keep the conversation with the tools
added. There is no way to inject a tool into a running session.

## Claude Code

With **Add the MCP server to Claude Code** on (the default), every Claude Code launch from Orca
also gets `--mcp-config` pointing at a file the worker wrote, so the tools are there even without
the user-scope registration. Run `/mcp` inside Claude Code to see `orca-db` and its three tools.
A waiting write counts against Claude Code's MCP tool timeout; raise `MCP_TOOL_TIMEOUT` if your
approvals take longer than its default.

## Other agents

Register the MCP server once; it finds the gateway through the environment Orca gives launched
agents or, failing that, the discovery file, so the registration holds no token.

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
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" -H "x-orca-agent: $ORCA_DB_AGENT" -H 'content-type: application/json' \
  -d '{"sql":"SELECT * FROM users LIMIT 10","maxRows":10}' "$ORCA_DB_GATEWAY_URL/connections/<id>/query"
```

| Route | Answer |
| --- | --- |
| `GET /health` | `{ ok, version, agentAccess }` (works even when access is off) |
| `GET /connections` | as `list_connections` |
| `GET /connections/<id>/schema` | as `describe_schema` |
| `POST /connections/<id>/query` `{ sql, maxRows? }` | as `run_query`; a write may block until approved |

Errors are `{ error: { code, message } }` with `401` (token), `400` (`invalid_params`), `403`
(`not_permitted`: access off, read-only mode, or a refused write), `504` (`timeout`: nobody
approved in time), `503` (`unavailable`: a driver did not load), `500` (the database's own
error message).

## Security model

- **Loopback only.** The gateway listens on `127.0.0.1` and never on a network interface.
- **One token per worker start**, 256 random bits, compared in constant time. It reaches agents
  only through the environment Orca gives them and the Claude Code config file, written with mode
  `0600` under the system temp directory and removed when the worker stops.
- **Read-only by default**, enforced twice: `classifySql` refuses anything but reads, then the
  session itself is read-only at the server (`readOnly` for SQLite,
  `default_transaction_read_only` for PostgreSQL, `TRANSACTION READ ONLY` for MySQL).
- **Writes need both** the global `read-write` setting and either the connection's **Always
  allow agent writes** or your approval; dangerous connections always need the approval.
- **Per-connection switch.** A connection with **Expose to agents** off is invisible to the
  gateway, whatever the global setting.
- **No passwords leave the worker.** Agents see connection ids, hosts and user names, never the
  password; the worker reads it from Orca's secrets only to open the session.
- **Row and time caps.** `Max rows per query` bounds every answer (agents may ask for fewer), and
  `Query timeout` is a server-side statement timeout for PostgreSQL and MySQL. SQLite queries run
  synchronously in the worker and have no timeout.
- **Everything is logged**, including refusals and errors, with the agent's name when it gave one.
  The name comes from the agent's own environment, so it is informative, not authenticated.

## Limits and notes

- The hook runs only for launches Orca makes (new tab, workspace create, orchestration, CLI).
  Restores and resumes of saved sessions are not hooked, so an agent restored after an Orca
  restart has stale values: start a new agent.
- A worker restart (a save while developing, **Restart** on the plugin row) changes the token and
  drops waiting approvals and logged rows; agents started before it get `401` until relaunched.
- `agent.launch.before` is a Claude Code `--mcp-config` injection only; Orca's reserved
  `contributes.mcpServers` point will replace it when its format ships.
- Browser clients (`orca serve`) have no plugin workers; the gateway exists only in the desktop app.
