# DB Connector for Orca

[한국어](README.ko.md)

A plugin for [Orca](https://onorca.dev), Stably's IDE for running AI coding agents in parallel.
It adds a right-sidebar panel where you save PostgreSQL, MySQL/MariaDB and SQLite connections,
browse their schemas and run queries, and it gives every agent Orca launches the same access
through a local gateway and an MCP server. Passwords live only in Orca's encrypted secrets store.

The install key is `maximinhan.db-connector` (Orca names the publisher after the repository owner).

## What it does

- **Panel**: save, test and remove connections; list tables, views and columns; run SQL with
  results in a table. Writes are refused unless you tick **Allow writes**, run inside a
  transaction, and on a **dangerous environment** need a second press.
- **Approval and log**: an agent's write waits for your **Approve** / **Refuse** in the panel
  (with a desktop notification) unless the connection says **Always allow agent writes**; a
  dangerous connection always asks. Every query from the panel or an agent lands in the
  **Activity** log with its SQL, outcome and rows.
- **Agents**: the worker runs a loopback HTTP gateway with a fresh bearer token each start. The
  `agent.launch.before` hook puts `ORCA_DB_GATEWAY_URL`, `ORCA_DB_GATEWAY_TOKEN` and
  `ORCA_DB_MCP_SERVER` into the environment of every agent Orca starts, and passes
  `--mcp-config` to Claude Code so its `orca-db` tools (`list_connections`, `describe_schema`,
  `run_query`) work with no setup. Agent access is **read-only by default** and enforced by the
  database session itself, not only by the plugin. See [docs/agent-access.md](docs/agent-access.md).
- **Drivers**: SQLite through Node's built-in `node:sqlite`; PostgreSQL (`pg`) and MySQL
  (`mysql2`) bundled into `vendor/` by `build/build.mjs`, because an installed plugin cannot carry
  `node_modules`.
- **Credentials**: a password kept in Orca's encrypted secrets, or an **AWS Secrets Manager**
  secret in the RDS format, which then supplies host, port, username, dbname and password (the
  form hides those fields). AWS credentials come from the environment, `~/.aws/credentials` or
  `credential_process` (signed with SigV4, no SDK bundled), else from the installed AWS CLI (SSO,
  roles). Secrets are cached in the worker for 5 minutes and never shown or logged.

## Layout

| Path | Role |
| --- | --- |
| `orca-plugin.json` | Manifest (format 2): `trusted-worker`, one panel, one hook, five settings, four capabilities |
| `src/worker.ts` | Worker entry (`main`): panel requests, the gateway, the launch hook |
| `src/panel.tsx` | The sidebar panel (components UI, no build step) |
| `src/protocol.ts` | Panel ↔ worker contract, type-checked on both sides |
| `src/connections.ts` | Connection registry: list in `storage:own`, passwords in `secrets:own` |
| `src/db/service.ts` | Test, schema and query over a connection; the write policy, approvals and logging |
| `src/aws/` | SigV4 signing, the AWS credential chain and the Secrets Manager client (CLI fallback) |
| `src/approvals/queue.ts` | Agent writes waiting for the person's decision |
| `src/log/query-log.ts` | The activity log and the rows of recent queries |
| `src/sql/classify.ts` | Read/write classification of SQL before a read-only session is opened |
| `src/drivers/` | `sqlite.ts`, `postgres.ts`, `mysql.ts` and the lazy registry |
| `src/gateway/` | The loopback HTTP API agents call |
| `src/agent/launch-hook.ts` | What `agent.launch.before` adds to an agent's command and environment |
| `mcp/orca-db-mcp.mjs` | The stdio MCP server agents run (plain Node, no dependencies) |
| `build/` → `vendor/` | Driver bundles and their licences (`THIRD_PARTY_NOTICES.txt`) |
| `docs/` | [Plugin development procedure](docs/orca-plugin-development.md), [agent access](docs/agent-access.md) |

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| Agent access | read-only | `off`, `read-only` or `read-write` for the gateway and MCP tools; with `read-write`, a write still waits for approval unless the connection allows it |
| Add the MCP server to Claude Code | on | Append `--mcp-config` to Claude Code launches |
| Approval timeout (ms) | 300000 | How long an agent write waits for your decision |
| Query timeout (ms) | 30000 | Server-side statement timeout (PostgreSQL, MySQL) |
| Max rows per query | 500 | Rows past this are dropped and the result marked truncated |

Each connection also has an **Environment label** (`local`, `dev`, `prod`, …), a **Credentials**
source (password or AWS Secrets Manager with secret name/ARN, region and profile), **Expose to
agents**, **Always allow agent writes** (off: each agent write asks you) and **Dangerous
environment** (writes always ask, queries are highlighted).

## Develop

You need the Orca desktop app (`brew install --cask stablyai/orca/orca` or
https://onorca.dev/download) and Node 22.18 or newer for the plain-Node tests.

```sh
orca plugin validate .      # the manifest and entries, with Orca's own rules
orca plugin dev watch .     # load this folder as a development plugin, print logs, reload on save
orca plugin types .         # write .orca/types (dev watch does it too)
npx tsc -p .                # type check
orca plugin test .          # every *.test.ts(x) in Node with orca/testing
orca plugin check .         # render src/panel.check.ts scenarios and report errors
orca plugin shot <key>      # PNG of the panel in .orca/shots/

npm run test:node           # the tests that need no Orca: drivers, gateway, hook, MCP server, worker wiring
npm run check:manifest      # manifest against the published JSON Schema, without Orca
npm run build:vendor        # rebuild vendor/ after changing build/package.json
```

The first load asks you to approve what the plugin gets (`trusted-worker`, storage, secrets,
settings, the launch hook). Outside a terminal, Orca prints the `--approve <fingerprint>` command
to re-run.

## Publish (community directory)

1. `orca plugin validate .` passes; commit and push.
2. Bump `version` in `orca-plugin.json`, commit, tag and push the tag:
   `git tag -a v0.4.0 -m v0.4.0 && git push origin v0.4.0`
3. Add the topic: `gh repo edit maximinhan/orca-db-connector --add-topic orca-plugin`
4. Check https://www.onorca.dev/plugins/maximinhan/orca-db-connector

## License

MIT, see [LICENSE](LICENSE). Bundled driver licences are in
[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).
