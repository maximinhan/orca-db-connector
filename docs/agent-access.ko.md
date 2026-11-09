# 에이전트 접근

[English](agent-access.md)

Orca 가 실행하는 에이전트(Claude Code, Codex, Gemini CLI 등)가 DB Connector 에 저장된
데이터베이스에 연결하고, 스키마를 보고, 쿼리를 실행하는 방법과, 에이전트의 쓰기가 승인되는 방식,
모든 쿼리가 기록되는 방식입니다.

## 동작 방식

```
Orca ──시작──▶ 플러그인 워커 (src/worker.ts)
                 ├─ 게이트웨이  http://127.0.0.1:<port>   bearer 토큰, 워커 시작마다 새로 생성
                 ├─ 훅         agent.launch.before      env 추가 (+ Claude Code 는 --mcp-config)
                 ├─ 승인 큐                              에이전트 쓰기가 패널의 결정을 기다리는 곳
                 └─ 쿼리 로그                            모든 쿼리와, 최근 쿼리의 결과 행
                                      │
Orca ──실행──▶ 에이전트 CLI ◀──────────┘ env: ORCA_DB_GATEWAY_URL, ORCA_DB_GATEWAY_TOKEN, ORCA_DB_MCP_SERVER, ORCA_DB_AGENT
                 └─ mcp/orca-db-mcp.mjs (stdio MCP) 실행 ──HTTP──▶ 게이트웨이 ──▶ src/db/service.ts ──▶ DB
```

1. 플러그인을 켜면 Orca 가 워커를 시작하고 계속 실행합니다(매니페스트에 훅이 있으므로). 워커는
   루프백 전용 HTTP 게이트웨이를 열고 무작위 bearer 토큰을 만듭니다.
2. Orca 가 터미널에서 에이전트를 실행할 때마다 `agent.launch.before` 훅이 그 에이전트에 환경 변수
   4개를 추가하고, Claude Code(`claude`, `claude-agent-teams`)에는 명령에 `--mcp-config <파일>` 을
   덧붙입니다. 이 파일에 MCP 서버와 토큰이 들어 있습니다.
3. MCP 서버(`mcp/orca-db-mcp.mjs`)는 의존성 없는 순수 Node 입니다. 환경 변수를 읽어 도구 호출을
   게이트웨이 요청으로 바꾸고, `x-orca-agent` 헤더로 에이전트 이름을 보내 로그에 누가 요청했는지 남깁니다.
4. 게이트웨이는 토큰과 **Agent access** 설정을 확인한 뒤 패널과 같은 `DbService` 로 요청을 처리합니다.
   읽기는 읽기 전용 세션에서, 쓰기는 아래 승인 정책을 거쳐 트랜잭션 안에서 실행됩니다.

## 에이전트가 받는 도구

| 도구 | 인자 | 응답 |
| --- | --- | --- |
| `list_connections` | 없음 | `{ connections: [{ id, name, driver, host, port, database, user, environment, dangerous, agentWrites, credentialSource }] }` (**Expose to agents** 가 켜진 연결만, 비밀번호 없음) |
| `describe_schema` | `connection` | `{ tables: [{ schema, name, kind, columns: [{ name, type, nullable, primaryKey }] }] }` |
| `run_query` | `connection`, `sql`, `max_rows?` | `{ columns, rows, rowCount, truncated, durationMs, message? }` |

MCP 서버의 `instructions` 가 이 순서로 호출하고, 쓰기 전에 무엇을 바꿀지 설명하고, 거부된 쓰기를
다시 시도하지 말라고 에이전트에 안내합니다. 결과는 JSON 텍스트와 `structuredContent` 로 돌아갑니다.

## 읽기, 쓰기, 승인

`SELECT`, `WITH`, `SHOW`, `EXPLAIN`, `DESCRIBE`, `PRAGMA`, `VALUES`, `TABLE` 로 시작하고 문자열과
주석 밖에 쓰기 키워드가 없는 문장은 **읽기**입니다(`src/sql/classify.ts`). 읽기는 항상 실행되며,
세션은 서버가 직접 읽기 전용으로 엽니다.

나머지는 모두 **쓰기**입니다. 에이전트의 쓰기는 다음과 같이 처리됩니다.

| Agent access (설정) | 연결 | 결과 |
| --- | --- | --- |
| `off` | 모두 | 게이트웨이가 `403`; 훅은 에이전트에 아무것도 추가하지 않음 |
| `read-only` (기본) | 모두 | `403 not_permitted`, 로그에 `denied` |
| `read-write` | **Always allow agent writes** 켜짐, 위험 환경 아님 | 트랜잭션 안에서 즉시 실행 (`approval: auto`) |
| `read-write` | **Always allow agent writes** 꺼짐 | 패널에서 **Approve** / **Refuse** 를 기다림 |
| `read-write` | **Dangerous environment** 켜짐 | 쓰기 옵션과 무관하게 항상 기다림 |

쓰기가 대기하는 동안 `run_query` 호출은 블록되고(Claude Code 에는 실행 중인 도구로 보임), 패널에
에이전트·연결·환경 레이블·SQL 이 담긴 카드가 뜨며, Orca 가 데스크톱 알림을 보냅니다. **Approve** 는
실행(`approval: approved`), **Refuse** 는 `403 not_permitted`("the write was refused in Orca"),
**Approval timeout** 설정(기본 5분)이 지나면 `504 timeout` 입니다. 에이전트가 먼저 포기하면(MCP 호출
취소, 소켓 종료) 요청은 거부된 것으로 큐에서 빠집니다.

승인되었든 자동이든 모든 쓰기는 `BEGIN` 과 `COMMIT`(MySQL 은 `START TRANSACTION`) 사이에서 실행되고,
그 안의 어떤 문장이라도 실패하면 롤백되므로 두 문장짜리 스크립트가 반만 적용되는 일은 없습니다.
트랜잭션 안에서 실행할 수 없는 문장(PostgreSQL `VACUUM`, `CREATE DATABASE`)은 서버 메시지와 함께 실패합니다.

패널 자체 콘솔도 **Allow writes** 체크박스로 같은 규칙을 따르며, 위험 환경 연결에서는 쓰기 전에
**Run on <환경>** 버튼을 한 번 더 눌러야 합니다.

## 환경 레이블과 위험 환경

연결마다 자유 입력 **Environment label**(`local`, `dev`, `staging`, `prod` …)이 있어 패널, 승인
카드, 로그에 배지로 표시되고 `list_connections` 로 에이전트에도 전달됩니다.

**Dangerous environment** 는 실수로 바꾸면 안 되는 DB 를 위한 연결별 스위치입니다.

- 에이전트 쓰기는 **Always allow agent writes** 와 무관하게 항상 승인을 기다립니다.
- 패널 자체 쓰기도 한 번 더 확인합니다.
- 연결, 승인 카드, 그 연결의 모든 로그 항목이 danger 톤과 `DANGEROUS` 배지로 강조되고,
  `list_connections` 가 `dangerous: true` 를 알려 에이전트도 조심할 수 있습니다.

## 활동 로그

**Activity** 섹션은 패널과 에이전트의 최근 쿼리 200개를 최신순으로 보여줍니다: 누가(`panel` 또는
`claude` 같은 에이전트 id), 연결과 환경 레이블, 읽기/쓰기, 결과(`ok`, `error`, `denied`, `timeout`),
반환되거나 변경된 행 수, 소요 시간, 사용자 승인 여부. 항목을 고르면 전체 SQL, 오류, 결과 행을 볼 수
있습니다. 워커는 최근 50개 쿼리의 행(**Max rows per query** 한도)을 보관하므로 다시 실행하지 않고도
최근 결과를 확인할 수 있습니다. 항목은 플러그인 storage 에 남아 재시작 후에도 유지되고, 행은 유지되지
않습니다. **Clear log** 는 둘 다 지웁니다.

## 훅이 보지 못한 세션

훅은 Orca 가 에이전트를 실행할 때만 돌므로, 플러그인을 켜기 전에 시작했거나 터미널에서 직접 띄웠거나 Orca 가
복원한 Claude Code 에는 `ORCA_DB_*` 변수가 없습니다. 이를 두 가지로 보완합니다.

- **디스커버리 파일.** 워커가 실행 중인 동안 `~/.orca-db-connector/gateway.json`(모드 `0600`)에 게이트웨이
  URL 과 토큰을 유지합니다. MCP 서버는 환경에 게이트웨이가 없으면 이 파일을 읽고, `401` 을 받으면 한 번 다시
  읽으므로 워커 재시작으로 토큰이 바뀌어도 설정을 바꿀 필요가 없습니다.
- **사용자 범위 등록.** 패널의 **Claude Code에 등록** 버튼이
  `claude mcp add --scope user --transport stdio orca-db --env ELECTRON_RUN_AS_NODE=1 -- <orca 바이너리> <mcp 서버>` 를 실행해
  서버를 Claude Code 사용자 설정에 넣습니다. 이 컴퓨터의 모든 Claude Code 가 어떻게 시작했든 이 서버를 로드합니다.
  워커의 PATH 에서 `claude` CLI 를 찾지 못하면 같은 명령을 직접 실행하라고 보여 줍니다.

이미 열려 있는 Claude Code 세션은 새 MCP 서버를 로드하지 않습니다. 같은 터미널에서 `/exit` 후
`claude --continue`(또는 `--resume`)를 실행하면 대화를 이어가면서 도구가 추가됩니다. 실행 중인 세션에
도구를 끼워 넣는 방법은 없습니다.

## Claude Code

**Add the MCP server to Claude Code** 가 켜져 있으면(기본) Orca 에서 실행되는 모든 Claude Code 에 워커가 쓴
파일을 가리키는 `--mcp-config` 도 붙으므로, 사용자 범위 등록 없이도 도구가 있습니다. Claude Code 안에서
`/mcp` 를 실행하면 `orca-db` 와 도구 3개가 보입니다. 대기 중인 쓰기는 Claude Code 의 MCP 도구 타임아웃에
걸리므로, 승인이 오래 걸린다면 `MCP_TOOL_TIMEOUT` 을 올리세요.

## 다른 에이전트

MCP 서버를 한 번 등록하세요. 서버는 Orca 가 실행한 에이전트의 환경 변수로, 없으면 디스커버리 파일로
게이트웨이를 찾으므로 등록에 토큰이 들어가지 않습니다.

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
curl -sS -H "Authorization: Bearer $ORCA_DB_GATEWAY_TOKEN" -H "x-orca-agent: $ORCA_DB_AGENT" -H 'content-type: application/json' \
  -d '{"sql":"SELECT * FROM users LIMIT 10","maxRows":10}' "$ORCA_DB_GATEWAY_URL/connections/<id>/query"
```

| 경로 | 응답 |
| --- | --- |
| `GET /health` | `{ ok, version, agentAccess }` (접근이 off 여도 동작) |
| `GET /connections` | `list_connections` 와 동일 |
| `GET /connections/<id>/schema` | `describe_schema` 와 동일 |
| `POST /connections/<id>/query` `{ sql, maxRows? }` | `run_query` 와 동일; 쓰기는 승인까지 블록될 수 있음 |

오류는 `{ error: { code, message } }` 이며 `401`(토큰), `400`(`invalid_params`), `403`
(`not_permitted`: 접근 off, 읽기 전용 모드, 거부된 쓰기), `504`(`timeout`: 제시간에 승인 없음),
`503`(`unavailable`: 드라이버 로드 실패), `500`(DB 자체 오류 메시지)입니다.

## 보안 모델

- **루프백 전용.** 게이트웨이는 `127.0.0.1` 에만 바인딩하고 네트워크 인터페이스에는 열지 않습니다.
- **워커 시작마다 토큰 1개**, 무작위 256비트, 상수 시간 비교. 토큰은 Orca 가 에이전트에 주는 환경과
  Claude Code 설정 파일(시스템 임시 디렉터리에 `0600` 모드로 기록, 워커 종료 시 삭제)로만 전달됩니다.
- **기본 읽기 전용**, 이중 강제: `classifySql` 이 읽기 외를 거부한 뒤, 세션 자체를 서버에서 읽기
  전용으로 엽니다(SQLite `readOnly`, PostgreSQL `default_transaction_read_only`, MySQL `TRANSACTION READ ONLY`).
- **쓰기는 두 조건이 모두 필요**: 전역 `read-write` 설정과, 연결의 **Always allow agent writes** 또는
  사용자의 승인. 위험 환경 연결은 항상 승인이 필요합니다.
- **연결별 스위치.** **Expose to agents** 가 꺼진 연결은 전역 설정과 무관하게 게이트웨이에서 보이지 않습니다.
- **비밀번호는 워커 밖으로 나가지 않습니다.** 에이전트는 연결 id, 호스트, 사용자명만 보며, 워커가
  세션을 열 때만 Orca secrets 에서 비밀번호를 읽습니다.
- **행 수와 시간 제한.** `Max rows per query` 가 모든 응답을 제한하고(에이전트는 더 적게 요청 가능),
  `Query timeout` 은 PostgreSQL/MySQL 의 서버 측 문장 타임아웃입니다. SQLite 쿼리는 워커에서 동기로
  실행되며 타임아웃이 없습니다.
- **모든 것이 기록됩니다.** 거부와 오류도 포함하며, 에이전트가 이름을 밝히면 함께 남깁니다. 이름은
  에이전트 자신의 환경에서 오므로 참고용이지 인증된 값은 아닙니다.

## 제한과 참고

- 훅은 Orca 가 만드는 실행(새 탭, 워크스페이스 생성, 오케스트레이션, CLI)에만 걸립니다. 저장된 세션의
  복원/재개는 훅 대상이 아니므로 Orca 재시작 후 복원된 에이전트는 값이 오래되었습니다. 새 에이전트를 시작하세요.
- 워커 재시작(개발 중 저장, 플러그인 행의 **Restart**)은 토큰을 바꾸고 대기 중인 승인과 보관 중인 결과
  행을 버립니다. 그 전에 시작된 에이전트는 재실행 전까지 `401` 을 받습니다.
- `agent.launch.before` 는 Claude Code 에 `--mcp-config` 를 주입하는 용도로만 씁니다. Orca 의 예약
  기여점 `contributes.mcpServers` 포맷이 나오면 그것으로 대체합니다.
- 브라우저 클라이언트(`orca serve`)에는 플러그인 워커가 없으므로 게이트웨이는 데스크톱 앱에서만 존재합니다.
