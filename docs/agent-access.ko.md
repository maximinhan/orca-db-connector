# 에이전트 접근

[English](agent-access.md)

Orca 가 실행하는 에이전트(Claude Code, Codex, Gemini CLI 등)가 DB Connector 에 저장된
데이터베이스에 연결하고, 스키마를 보고, 쿼리를 실행하는 방법입니다.

## 동작 방식

```
Orca ──시작──▶ 플러그인 워커 (src/worker.ts)
                 ├─ 게이트웨이  http://127.0.0.1:<port>   bearer 토큰, 워커 시작마다 새로 생성
                 └─ 훅         agent.launch.before      env 추가 (+ Claude Code 는 --mcp-config)
                                      │
Orca ──실행──▶ 에이전트 CLI ◀──────────┘ env: ORCA_DB_GATEWAY_URL, ORCA_DB_GATEWAY_TOKEN, ORCA_DB_MCP_SERVER
                 └─ mcp/orca-db-mcp.mjs (stdio MCP) 실행 ──HTTP──▶ 게이트웨이 ──▶ src/db/service.ts ──▶ DB
```

1. 플러그인을 켜면 Orca 가 워커를 시작하고 계속 실행합니다(매니페스트에 훅이 있으므로). 워커는
   루프백 전용 HTTP 게이트웨이를 열고 무작위 bearer 토큰을 만듭니다.
2. Orca 가 터미널에서 에이전트를 실행할 때마다 `agent.launch.before` 훅이 그 에이전트에 환경 변수
   3개를 추가하고, Claude Code(`claude`, `claude-agent-teams`)에는 명령에 `--mcp-config <파일>` 을
   덧붙입니다. 이 파일에 MCP 서버와 토큰이 들어 있습니다.
3. MCP 서버(`mcp/orca-db-mcp.mjs`)는 의존성 없는 순수 Node 입니다. 환경 변수 2개를 읽어 도구 호출을
   게이트웨이 요청으로 바꿉니다.
4. 게이트웨이는 토큰과 **Agent access** 설정을 확인한 뒤 패널과 같은 `DbService` 로 요청을 처리합니다.
   읽기 전용 모드에서는 SQL 을 먼저 분류하고 DB 세션을 읽기 전용으로 엽니다(SQLite `readOnly`,
   PostgreSQL `default_transaction_read_only`, MySQL `TRANSACTION READ ONLY`). 즉 서버 자체가 쓰기를 거부합니다.

## 에이전트가 받는 도구

| 도구 | 인자 | 응답 |
| --- | --- | --- |
| `list_connections` | 없음 | `{ connections: [{ id, name, driver, host, port, database, user }] }` (**Expose to agents** 가 켜진 연결만, 비밀번호 없음) |
| `describe_schema` | `connection` | `{ tables: [{ schema, name, kind, columns: [{ name, type, nullable, primaryKey }] }] }` |
| `run_query` | `connection`, `sql`, `max_rows?` | `{ columns, rows, rowCount, truncated, durationMs, message? }` |

MCP 서버의 `instructions` 가 이 순서로 호출하라고 에이전트에 안내합니다. 결과는 JSON 텍스트와
`structuredContent` 로 돌아갑니다.

## Claude Code

할 일이 없습니다. **Add the MCP server to Claude Code** 가 켜져 있으면(기본) Orca 에서 실행되는 모든
Claude Code 에 워커가 쓴 파일을 가리키는 `--mcp-config` 가 붙습니다. Claude Code 안에서 `/mcp` 를
실행하면 `orca-db` 와 도구 3개가 보입니다. 직접 `--mcp-config` 를 붙여 실행했다면 플러그인은 명령을
건드리지 않으므로 아래처럼 직접 등록하면 됩니다.

## 다른 에이전트

모든 에이전트가 환경 변수를 받으므로, 그 변수를 물려받는 명령으로 MCP 서버를 한 번 등록합니다.
토큰은 워커가 재시작되면 바뀌므로 설정 파일에 복사하지 말고, 서버가 실행 시점에 환경에서 읽게 두세요.

```sh
# Codex CLI
codex mcp add orca-db -- node "$ORCA_DB_MCP_SERVER"

# Gemini CLI
gemini mcp add orca-db node "$ORCA_DB_MCP_SERVER"

# JSON 정의를 받는 모든 MCP 클라이언트
{ "mcpServers": { "orca-db": { "command": "node", "args": ["<ORCA_DB_MCP_SERVER 값>"] } } }
```

MCP 가 없는 에이전트는 게이트웨이를 직접 호출할 수 있습니다:

```sh
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" "$ORCA_DB_GATEWAY_URL/connections"
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" "$ORCA_DB_GATEWAY_URL/connections/<id>/schema"
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" -H 'content-type: application/json' \
  -d '{"sql":"SELECT * FROM users LIMIT 10","maxRows":10}' "$ORCA_DB_GATEWAY_URL/connections/<id>/query"
```

| 경로 | 응답 |
| --- | --- |
| `GET /health` | `{ ok, version, agentAccess }` (접근이 off 여도 동작) |
| `GET /connections` | `list_connections` 와 동일 |
| `GET /connections/<id>/schema` | `describe_schema` 와 동일 |
| `POST /connections/<id>/query` `{ sql, maxRows? }` | `run_query` 와 동일 |

오류는 `{ error: { code, message } }` 이며 `401`(토큰), `400`(`invalid_params`), `403`
(`not_permitted`: 접근 off 또는 읽기 전용 모드의 쓰기), `503`(`unavailable`: 드라이버 로드 실패),
`500`(DB 자체 오류 메시지)입니다.

## 보안 모델

- **루프백 전용.** 게이트웨이는 `127.0.0.1` 에만 바인딩하고 네트워크 인터페이스에는 열지 않습니다.
- **워커 시작마다 토큰 1개**, 무작위 256비트, 상수 시간 비교. 토큰은 Orca 가 에이전트에 주는 환경과
  Claude Code 설정 파일(시스템 임시 디렉터리에 `0600` 모드로 기록, 워커 종료 시 삭제)로만 전달됩니다.
- **기본 읽기 전용**, 이중 강제: `classifySql` 이 `SELECT`, `WITH`, `SHOW`, `EXPLAIN`, `DESCRIBE`,
  `PRAGMA` 외(그리고 `WITH … INSERT`, `SELECT … INTO`, `PRAGMA x = y`)를 거부한 뒤, 세션 자체를
  서버에서 읽기 전용으로 엽니다. **Agent access** 를 `read-write` 로 바꾸는 것은 의도적으로만
  하세요. `off` 면 훅은 아무것도 하지 않고 게이트웨이는 `403` 을 돌려줍니다.
- **연결별 스위치.** **Expose to agents** 가 꺼진 연결은 전역 설정과 무관하게 게이트웨이에서 보이지 않습니다.
- **비밀번호는 워커 밖으로 나가지 않습니다.** 에이전트는 연결 id, 호스트, 사용자명만 보며, 워커가
  세션을 열 때만 Orca secrets 에서 비밀번호를 읽습니다.
- **행 수와 시간 제한.** `Max rows per query` 가 모든 응답을 제한하고(에이전트는 더 적게 요청 가능),
  `Query timeout` 은 PostgreSQL/MySQL 의 서버 측 문장 타임아웃입니다. SQLite 쿼리는 워커에서 동기로
  실행되며 타임아웃이 없습니다.
- **쓰기는 사용자의 결정.** `read-write` 에서는 에이전트가 보낸 그대로 실행되며 플러그인이 트랜잭션이나
  확인을 추가하지 않습니다.

## 제한과 참고

- 훅은 Orca 가 만드는 실행(새 탭, 워크스페이스 생성, 오케스트레이션, CLI)에만 걸립니다. 저장된 세션의
  복원/재개는 훅 대상이 아니므로 Orca 재시작 후 복원된 에이전트는 값이 오래되었습니다. 새 에이전트를 시작하세요.
- 워커 재시작(개발 중 저장, 플러그인 행의 **Restart**, 유휴 워커 중지)은 토큰을 바꿉니다. 그 전에 시작된
  에이전트는 재실행 전까지 `401` 을 받습니다.
- `agent.launch.before` 는 Claude Code 에 `--mcp-config` 를 주입하는 용도로만 씁니다. Orca 의 예약
  기여점 `contributes.mcpServers` 포맷이 나오면 그것으로 대체합니다.
- 브라우저 클라이언트(`orca serve`)에는 플러그인 워커가 없으므로 게이트웨이는 데스크톱 앱에서만 존재합니다.
