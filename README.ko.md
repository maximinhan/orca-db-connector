# DB Connector for Orca

[English](README.md)

[Orca](https://onorca.dev)(Stably의 AI 코딩 에이전트 병렬 실행 IDE) 플러그인입니다.
오른쪽 사이드바 패널에서 PostgreSQL, MySQL/MariaDB, SQLite 연결을 저장하고 스키마를 보고 쿼리를
실행할 수 있으며, Orca가 실행하는 모든 에이전트에게 로컬 게이트웨이와 MCP 서버를 통해 같은 접근을
제공합니다. 비밀번호는 Orca의 암호화된 secrets 저장소에만 보관됩니다.

설치 키는 `maximinhan.db-connector` 입니다 (publisher는 저장소 소유자에서 Orca가 자동으로 정합니다).

## 기능

- **패널**: 연결 저장/테스트/삭제, 테이블·뷰·컬럼 목록, SQL 실행과 결과 테이블. **Allow writes** 를
  켜지 않으면 쓰기 문은 거부되고, 쓰기는 트랜잭션 안에서 실행되며, **위험 환경**에서는 한 번 더 확인합니다.
- **승인과 로그**: 에이전트의 쓰기는 연결에 **Always allow agent writes** 가 켜져 있지 않으면 패널에서
  **Approve** / **Refuse** 를 기다립니다(데스크톱 알림 포함). 위험 환경 연결은 항상 묻습니다. 패널과
  에이전트의 모든 쿼리가 **Activity** 로그에 SQL·결과·행과 함께 남습니다.
- **에이전트**: 워커가 시작할 때마다 새 bearer 토큰으로 루프백 HTTP 게이트웨이를 엽니다.
  `agent.launch.before` 훅이 Orca가 실행하는 모든 에이전트의 환경에 `ORCA_DB_GATEWAY_URL`,
  `ORCA_DB_GATEWAY_TOKEN`, `ORCA_DB_MCP_SERVER` 를 넣고, Claude Code 에는 `--mcp-config` 를 붙여
  `orca-db` 도구(`list_connections`, `describe_schema`, `run_query`)가 설정 없이 동작하게 합니다.
  에이전트 접근은 **기본 읽기 전용**이며 플러그인뿐 아니라 DB 세션 자체가 강제합니다.
  [docs/agent-access.ko.md](docs/agent-access.ko.md) 참고.
- **드라이버**: SQLite 는 Node 내장 `node:sqlite`, PostgreSQL(`pg`)과 MySQL(`mysql2`)은
  `build/build.mjs` 가 `vendor/` 에 번들합니다 (설치된 플러그인은 `node_modules` 를 가질 수 없음).
- **Orca 가 띄운 세션뿐 아니라 모든 Claude Code**: **Claude Code에 등록** 버튼이 MCP 서버를 Claude Code 사용자
  설정에 추가하고(`claude mcp add --scope user`), 서버는 워커가 실행 중일 때 기록하는 디스커버리 파일
  (`~/.orca-db-connector/gateway.json`)로 게이트웨이를 찾으므로 토큰을 저장하지 않고 워커 재시작도 따라갑니다.
  이미 열려 있는 세션은 `/exit` 후 `claude --continue` 로 반영됩니다.
- **언어**: 패널과 알림은 Orca 의 UI 언어를 따릅니다(한국어 또는 영어).
- **자격 증명**: Orca 암호화 secrets 에 보관한 비밀번호, 또는 RDS 형식의 **AWS Secrets Manager** 시크릿.
  후자는 host, port, username, dbname, password 를 모두 시크릿에서 가져오며 폼에서 해당 필드가 사라집니다. AWS 자격 증명은 환경
  변수, `~/.aws/credentials`, `credential_process` 에서 읽어 SigV4 로 직접 서명하고(SDK 번들 없음), 없으면
  설치된 AWS CLI(SSO, 역할)로 폴백합니다. 시크릿은 워커에 5분 캐시되며 표시·기록되지 않습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `orca-plugin.json` | 매니페스트(format 2): `trusted-worker`, 패널 1, 훅 1, 설정 5, capability 4 |
| `src/worker.ts` | 워커 진입점(`main`): 패널 요청, 게이트웨이, 런치 훅 |
| `src/panel.tsx` | 사이드바 패널(components UI, 빌드 없음) |
| `src/protocol.ts` | 패널 ↔ 워커 계약, 양쪽에서 타입 검사 |
| `src/connections.ts` | 연결 저장소: 목록은 `storage:own`, 비밀번호는 `secrets:own` |
| `src/db/service.ts` | 연결 테스트·스키마·쿼리. 쓰기 정책, 승인, 로깅 |
| `src/aws/` | SigV4 서명, AWS 자격 증명 체인, Secrets Manager 클라이언트(CLI 폴백) |
| `src/approvals/queue.ts` | 사용자의 결정을 기다리는 에이전트 쓰기 |
| `src/log/query-log.ts` | 활동 로그와 최근 쿼리의 결과 행 |
| `src/sql/classify.ts` | 읽기 전용 세션을 열기 전 SQL 의 읽기/쓰기 분류 |
| `src/drivers/` | `sqlite.ts`, `postgres.ts`, `mysql.ts` 와 지연 로딩 레지스트리 |
| `src/gateway/` | 에이전트가 호출하는 루프백 HTTP API |
| `src/agent/launch-hook.ts` | `agent.launch.before` 가 에이전트 명령/환경에 추가하는 것 |
| `src/agent/discovery.ts`, `src/agent/claude-setup.ts` | 게이트웨이 디스커버리 파일과 Claude Code 사용자 범위 등록 |
| `src/i18n.ts` | 패널 문구의 영문/한글 사전. Orca UI 언어로 선택 |
| `mcp/orca-db-mcp.mjs` | 에이전트가 실행하는 stdio MCP 서버(순수 Node, 의존성 없음) |
| `build/` → `vendor/` | 드라이버 번들과 라이선스(`THIRD_PARTY_NOTICES.txt`) |
| `docs/` | [플러그인 개발 절차](docs/orca-plugin-development.ko.md), [에이전트 접근](docs/agent-access.ko.md) |

## 설정

| 설정 | 기본값 | 의미 |
| --- | --- | --- |
| Agent access | read-only | 게이트웨이와 MCP 도구의 권한: `off`, `read-only`, `read-write`. `read-write` 여도 연결이 허용하지 않으면 쓰기는 승인을 기다림 |
| Add the MCP server to Claude Code | 켜짐 | Claude Code 실행 명령에 `--mcp-config` 추가 |
| Approval timeout (ms) | 300000 | 에이전트 쓰기가 사용자의 결정을 기다리는 시간 |
| Query timeout (ms) | 30000 | 서버 측 문장 타임아웃(PostgreSQL, MySQL) |
| Max rows per query | 500 | 이 수를 넘는 행은 버리고 결과에 truncated 표시 |

연결마다 **Environment label**(`local`, `dev`, `prod` …), **Credentials** 출처(비밀번호 또는 AWS Secrets
Manager: 시크릿 이름/ARN, 리전, 프로필), **Expose to agents**, **Always allow agent writes**(꺼짐: 에이전트
쓰기마다 묻기), **Dangerous environment**(쓰기는 무조건 묻고 쿼리를 강조)가 있습니다.

## 개발

Orca 데스크톱 앱(`brew install --cask stablyai/orca/orca` 또는 https://onorca.dev/download)과,
순수 Node 테스트를 위해 Node 22.18 이상이 필요합니다.

```sh
orca plugin validate .      # 매니페스트와 진입 파일을 Orca 규칙으로 검사
orca plugin dev watch .     # 이 폴더를 개발 플러그인으로 로드, 로그 출력, 저장 시 리로드
orca plugin types .         # .orca/types 생성 (dev watch 가 자동 수행)
npx tsc -p .                # 타입 검사
orca plugin test .          # 모든 *.test.ts(x) 를 orca/testing 으로 Node 에서 실행
orca plugin check .         # src/panel.check.ts 시나리오를 렌더링해 오류 보고
orca plugin shot <key>      # 패널 PNG 를 .orca/shots/ 에 저장

npm run test:node           # Orca 없이 도는 테스트: 드라이버, 게이트웨이, 훅, MCP 서버, 워커 배선
npm run check:manifest      # Orca 없이 공개 JSON Schema 로 매니페스트 점검
npm run build:vendor        # build/package.json 변경 후 vendor/ 재생성
```

첫 로드 때 Orca 가 플러그인이 받는 권한(`trusted-worker`, storage, secrets, settings, 런치 훅)을
보여주고 승인을 요구합니다. 터미널이 아니면 `--approve <fingerprint>` 로 다시 실행할 명령을 출력합니다.

## 배포 (커뮤니티 디렉터리)

1. `orca plugin validate .` 통과, 커밋·푸시
2. `orca-plugin.json` 의 `version` 을 올려 커밋한 뒤 태그:
   `git tag -a v0.6.0 -m v0.6.0 && git push origin v0.6.0`
3. 토픽 추가: `gh repo edit maximinhan/orca-db-connector --add-topic orca-plugin`
4. https://www.onorca.dev/plugins/maximinhan/orca-db-connector 확인

## 라이선스

MIT. [LICENSE](LICENSE) 참고. 번들된 드라이버의 라이선스는
[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) 에 있습니다.
