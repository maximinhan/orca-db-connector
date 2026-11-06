# Orca 플러그인 개발 절차

[English](orca-plugin-development.md)

이 문서는 Orca(https://onorca.dev, GitHub `stablyai/orca`) 플러그인을 이 저장소에서 개발하고 배포하는
절차를 공식 문서 기준으로 정리한 것입니다. 모든 내용의 출처는 `stablyai/orca` 저장소
커밋 `554a16f3` (2026-11-05) 와 `stablyai/orca-plugins` 커밋 `1a464704` (2026-11-03) 입니다.

| 출처 (stablyai/orca) | 내용 |
| --- | --- |
| `docs/reference/plugin-authoring.md` | 작성 → 로드 → 검증 → 디렉터리 등록 → 카탈로그 배포 전체 흐름 |
| `docs/reference/plugin-manifest.md`, `docs/schemas/plugins/orca-plugin.v2.schema.json` | 매니페스트 필드 전체와 JSON Schema |
| `docs/reference/plugin-host-api.md` | 워커/패널이 부를 수 있는 호스트 API, 이벤트, 훅, 오류 코드 |
| `docs/reference/plugin-declarative-ui.md` | components 패널(TSX) 작성법, 컴포넌트 카탈로그, 테스트 |
| `docs/reference/plugin-listing-policy.md` | 디렉터리/카탈로그 등재 정책 |
| `examples/plugins/hello-worker-panel`, `src/cli/plugin-authoring/plugin-worker-panel-template.ts` | 이 저장소 스캐폴드의 원형 |
| (stablyai/orca-plugins) `CONTRIBUTING.md`, `REVIEW_POLICY.md`, `plugins/sqlite-browser` | 공식 카탈로그 운영 방식, 리뷰 기준, DB 계열 공식 플러그인 선례 |

## 0. 결론 요약

- Orca 플러그인은 **TypeScript/JavaScript** 로만 만듭니다. 워커는 Orca가 띄우는 별도 Node 프로세스
  (Electron 바이너리를 `ELECTRON_RUN_AS_NODE` 로 실행), 패널은 샌드박스 웹뷰에서 돌아갑니다.
  Spring/Kotlin 은 플러그인 본체에 쓸 수 없습니다. (Kotlin 서버를 따로 두고 워커가 HTTP로 호출하는 구조는 가능합니다.)
- DB 커넥터처럼 **네트워크/DB 소켓**을 여는 기능은 `trusted-worker` 프로필의 워커에서만 가능합니다.
  패널 프레임은 네트워크가 완전히 막혀 있습니다.
- 플러그인은 `orca-plugin.json` 이 루트에 있는 폴더(사실상 Git 저장소 하나)이고, 커뮤니티 배포는
  **GitHub 태그 + `orca-plugin` 토픽**만으로 자동 등재됩니다. PR 로 공식 카탈로그에 넣는 방식은 거부됩니다.
- 이 저장소는 `orca plugin create <dir> --template worker-panel` 이 만드는 구조에 훅, 게이트웨이,
  번들 드라이버를 더한 것입니다.

## 1. 실행 프로필과 권한 설계

`execution` 은 플러그인이 요구하는 최대 권한이며, 사용자가 설치 시 승인하는 범위를 결정합니다. 가장 낮은
것을 고릅니다.

| 프로필 | 허용 | 비고 |
| --- | --- | --- |
| `data` | 테마, 터미널 테마, 아이콘 테마, 문법, 번역 | 원클릭 설치 |
| `declarative` | 명령(Orca 내장 액션 실행), 단축키, VM 레시피, 상태바 항목 | 활성화 전 리뷰 |
| `sandboxed-ui` | 패널, 커스텀 에디터 (샌드박스 프레임, `window.orca` 로만 통신) | 네트워크 없음 |
| `trusted-worker` | `main` 워커(Node), 이벤트 구독, 훅, 워커 명령 | 설치 시 개별 승인 필수 |

DB 커넥터는 `trusted-worker` 입니다. capability 는 실제로 쓰는 것만 선언합니다 (리뷰 기준: "각 capability 가
설명되고 사용될 것").

| capability | 이 플러그인에서의 용도 |
| --- | --- |
| `storage:own` | 연결 목록(JSON) 저장 |
| `secrets:own` | 비밀번호를 OS 키링 기반 암호화 저장소에 보관 (`secrets.protection` 이 `unavailable` 이면 `secrets.set` 실패) |
| `settings:own` | `contributes.settings` 로 선언한 설정을 Settings 화면에서 편집 |

추가로 쓸 수 있는 것: `notifications:show`(데스크톱 알림), `workspace:read`/`workspace:write`,
`terminal:send`/`terminal:read`, `agent:read`/`agent:launch`, `appearance:write`.

예약되어 아직 쓸 수 없는 기여점(빈 배열만 허용): `connections`, `mcpServers`, `taskSources`, `skills`,
`hooks`(에이전트 라이프사이클; 아래 매니페스트의 `contributes.hooks` 와는 다름), `agentHarnesses`,
`sidebarCards`. DB 를 MCP 서버로 에이전트에 노출하는 것은 `mcpServers` 포맷이 정해진 뒤 가능하며, 그 전까지
이 플러그인은 `agent.launch.before` 훅에서 `--mcp-config` 를 주입합니다 ([agent-access.ko.md](agent-access.ko.md)).

## 2. 매니페스트 규칙 (`orca-plugin.json`)

- `"manifestVersion": 2` 필수. 모르는 키는 어느 깊이에서든 거부됩니다 (strict).
- `publisher` 는 **쓰지 않습니다**. Orca가 설치 출처에서 정합니다: GitHub 소유자 → `maximinhan`,
  개발 폴더 → `local`. 생략하려면 `engines.orca` 가 `>=1.4.246` 이상이어야 합니다.
- `id` 는 kebab-case. `orca-` 접두사와 `stablyai`/`official`/`anthropic`/`openai`/`github`/`orca*` 소유자는 예약.
- `engines.orca` 는 사용하는 필드/컴포넌트의 가장 높은 "Since" 로 맞춥니다. 이 저장소는 `>=1.4.248`
  (`contributes.hooks` 1.4.248, `contributes.settings` 1.4.246, `Callout`/`Table`/`Tree`/`Textarea`/
  `Checkbox`/`KeyValue`/`Collapsible` 컴포넌트 1.4.247).
- `pluginApi: 1` 은 패널/워커가 호스트 API 를 쓸 때만 넣습니다 (`data`/`declarative` 에서는 거부).
- `main` 은 `.js`/`.mjs` 또는 `.ts`/`.mts` (빌드 없이 Orca가 트랜스파일). **`.tsx` 워커는 불가**.
- `license` 는 SPDX 식. 저장소에 같은 내용의 `LICENSE` 파일을 둡니다 (리뷰 항목).
- `contributes.hooks` 항목은 훅 이름(여기서는 `agent.launch.before`)과 `onError`(`pass`|`deny`)를 가집니다.
  훅이 있으면 Orca 는 플러그인 활성화 시 워커를 시작하고 계속 실행하며, 이것이 에이전트 게이트웨이를 유지합니다.
- 에디터 자동완성: `$schema` 에 공개 스키마 URL 을 넣습니다 (Orca는 무시).
- 이미지 제한: `icon` PNG/WEBP 정사각 128px 이상 256 KB 이하, `cover` 800×500 이상(권장 1600×1000) 1024 KB 이하,
  `screenshots` 최대 6장 1280×800 이상 1536 KB 이하, 전체 8 MB 이하. 실제 플러그인 화면만, 가짜 신뢰 배지 금지.

## 3. 코드 구조

### 워커 (`src/worker.ts`)

- **default export** 가 `activate(orca)` 여야 합니다 (named export 면 시작 실패). `export function deactivate()` 는 선택.
- 받는 객체: `orca.api`, `orca.host.call/has`, `orca.commands.register`, `orca.events.on`, `orca.hooks.on`,
  `orca.panels.handle/post`, `orca.storage.get/set/delete/keys/onDidChange`, `orca.settings.get/set/onDidChange`,
  `orca.secrets.get/set/delete`, `orca.grantedCapabilities`, `orca.log`.
- 훅이나 상태바 항목이 없으면 워커는 유휴 시 중지되고 다음 요청/이벤트 때 다시 시작됩니다. 메모리 상태는
  사라지므로 지속 데이터는 storage 에 둡니다.
- 핸들러가 던지는 오류의 `code` 는 패널의 `plugin.request` 거부로 전달됩니다. 아는 코드(`invalid_params`,
  `conflict`, `unavailable`, `timeout`, `not_permitted` ...)만 유지되고 나머지는 `action_failed`.
- 요청 입력 64 KiB, 응답 1 MiB, `post` 256 KiB·10초당 200회 제한. 타임아웃 기본 30초, 최대 120초.
- 훅: `orca.hooks.on(hook, (event, next) => ...)`. `next(바뀐 event)` 를 반환하면 진행, `{ deny: reason }` 이면
  중단, 아무것도 반환하지 않으면 통과. 핸들러 제한 2초. 호스트 호출을 await 하기 전에 결정해야 합니다
  (이 플러그인이 설정을 캐시하는 이유).
- 상대 import 는 확장자 없이도, `.ts` 를 붙여도 됩니다. `node:` 빌트인과 패키지는 Node 규칙 그대로.
  `orca/worker` 는 타입 전용이므로 `import type` 으로만.
- 워커는 전체 권한을 가진 Node 입니다: 소켓 리슨, 파일 읽기, 프로세스 실행이 가능하며 그래서
  `trusted-worker` 는 설치마다 승인을 받습니다.

### 패널 (`src/panel.tsx`, `ui: "components"`)

- default export 가 컴포넌트 함수. 훅 없음, 상태는 `atom`/`derived`/`read`/`set`/`update`.
- import 는 `orca`, `orca/*`, 상대 파일만. `react` 같은 bare 패키지는 로드 실패. npm 패키지가 필요하면
  esbuild 로 번들해 `.js` 를 `entry` 로 지정 (`--external:orca --external:'orca/*' --jsx=automatic --jsx-import-source=orca`).
- 컴포넌트는 `orca` 모듈에서 이름으로 import. 기본 카탈로그: `Stack Row Text Heading Button IconButton Badge Card
  List ListItem Input Switch Select Separator Progress Spinner EmptyState Link Code`.
  1.4.247 추가: `Textarea Checkbox RadioGroup Slider Field Tabs Tab Collapsible Toolbar Grid Table Tree Markdown
  CodeView Image KeyValue Callout Skeleton RelativeTime`. 1.4.248 추가: `Box`.
  최소 지원 버전보다 새 컴포넌트는 `ui.has('Table')` 로 확인 후 `h('Table', …)` 로 생성.
- 렌더 제한: 5000 노드, 깊이 64, 약 512 KiB, 텍스트 16 KiB, Select 옵션 500, Table 행 5000.
- `shell.openExternal`/`files.saveAs` 는 Button/IconButton/ListItem/Link 의 실제 클릭 직후 1초 안에서만.
- 패널 ↔ 워커: 패널 `plugin.request(name, input, { timeoutMs })` ↔ 워커 `orca.panels.handle(name, fn)`,
  워커 `orca.panels.post(event, payload)` ↔ 패널 `plugin.on(event, fn)`. 계약은 `src/protocol.ts` 의
  `declare module 'orca' { interface PluginRequests / PluginPanelEvents }` 하나로 양쪽 타입 검사.
- 데이터 공유: `atom(key, init, { persist: 'storage' })` 는 워커의 `orca.storage.get(key)` 와 같은 값.
  `persist: 'plugin'`/`'workspace'` 는 패널 전용 지속 상태(capability 불필요).

## 4. 의존성과 크기 제한 (번들 드라이버가 따르는 규칙)

- 설치 시 Orca는 루트 `.git/` 을 제외한 **모든 파일을 복사하고 해시**합니다. 개발 폴더에서는 `node_modules/`,
  `.orca/`, `.git/` 이 무시되지만, 설치본에는 `node_modules` 가 없으므로 **npm 패키지는 번들해서 커밋**해야 합니다.
  이 저장소는 `build/` → `vendor/`(`pg.cjs`, `mysql2.cjs`)로 그렇게 하며 `createRequire` 로 로드합니다.
- 제한: 폴더당 2,000 파일·50 MiB, 패널/에디터 entry 10 MiB, 트랜스파일 대상 `.ts/.tsx` 파일당 1 MiB,
  **카탈로그 등재 시 파일당 1 MiB**.
- 정책: 난독화/검토 불가 minify 금지, 번들 산출물은 소스가 저장소에 있을 때만 허용. 공식 카탈로그 리뷰는
  "컴파일된 실행 파일, 네이티브 모듈 금지". 추적/분석/데이터 수집 금지. 유료 기능 금지(사용자 본인의 유료 서비스 접속은 가능).
- 선례 `plugins/sqlite-browser`: `build/`(package.json + esbuild + 테스트) → 생성물 폴더를 커밋,
  `.gitattributes` 로 `linguist-generated`, `THIRD_PARTY_NOTICES.txt` 에 번들 라이선스 기록, 빌드 스크립트가
  1 MiB 초과와 `eval`/`Function` 사용을 실패 처리.

이 저장소의 드라이버 선택:

| 드라이버 | 방식 | 비고 |
| --- | --- | --- |
| SQLite | Node 빌트인 `node:sqlite` | 의존성·빌드 없음. 워커 Node ≥22.13(플래그 없는 `node:sqlite`) 필요; Orca 는 Electron 43 사용 |
| PostgreSQL | `pg` 를 esbuild 로 번들(`platform=node`, CommonJS, minify 없음) | 170 KB; `pg-native` 는 external |
| MySQL/MariaDB | `mysql2/promise` 를 `iconv-lite`, `aws-ssl-profiles` shim 과 함께 번들 | 576 KB; utf8/latin1/ascii/ucs2 charset 만 지원 |
| 네이티브 모듈(`better-sqlite3`, `pg-native`) | 불가 | 바이너리 금지, 설치 해시 불일치 |

## 5. 개발 루프

1. **Orca 데스크톱 설치**: `brew install --cask stablyai/orca/orca` (bare `orca` 는 다른 Plotly cask) 또는
   https://onorca.dev/download. `orca` CLI 가 함께 들어옵니다. 패널/워커 로드, 스크린샷, 승인은 데스크톱 앱이
   필요하며 `orca serve`(브라우저) 로는 components 패널이 보이지 않습니다.
2. **(새로 만들 때)** `orca plugin create <dir> --template worker-panel` 로 스캐폴드. 템플릿:
   `theme | terminal-theme | icon-theme | syntax | language-pack | editor | panel | components | worker-panel`.
   이 저장소는 이미 같은 구조입니다.
3. **로드**: 플러그인 폴더에서 `orca plugin dev watch .`
   - `.orca/types` 타이핑을 쓰고 폴더를 개발 플러그인(`local.db-connector`)으로 로드, 로그와 `↻ reloaded` 를 출력.
   - 첫 로드는 승인이 필요: 터미널에서는 `Approve and load? [y/N]`, 비대화형(에이전트/파이프/`--json`)에서는
     exit 3 과 함께 `orca plugin dev reload . --approve <fingerprint>` 명령을 출력. 스스로 승인하지 않음.
   - capability 추가·프로필 상향·명령/단축키 변경은 재승인. 패널/워커 코드 변경은 재승인 없이 핫리로드
     (워커는 재시작되어 메모리 상태 소실; 이 플러그인의 게이트웨이 토큰도 바뀜).
   - GUI 대안: Settings → Plugins → **Turn on plugins** → **Development folders…** 에 폴더 추가 → 검토·활성화.
4. **타입 검사**: `orca plugin types .` (dev watch 가 자동 실행) 후 `npx tsc -p .`.
   `tsconfig.json` 은 `./.orca/types/tsconfig.json` 을 extends 하며 `.orca/` 는 커밋하지 않습니다. 이 저장소는
   워커 측 파일이 `.ts` 확장자로 import 하므로(순수 Node 테스트용) `allowImportingTsExtensions` 를 추가했습니다.
5. **테스트**: `orca plugin test .` 가 `src/*.test.ts(x)` 를 Node `node:test` 로 실행하며 `orca/testing`
   (`mount` 패널, `mountWorker` 워커, `mockHost({ storage, settings, secrets, requests, results })`,
   `mockEditorHost` 에디터)을 해석합니다. 테스트와 check 는 샌드박스 밖(내 머신 전체 권한)에서 코드를
   실행하므로 신뢰하는 코드에만 사용. `npm run test:node` 는 Orca 없이 도는 부분집합입니다.
6. **렌더 점검**: `orca plugin check .` 가 `src/panel.check.ts` 시나리오마다 패널을 그려 `file:line` 오류,
   거부될 레이아웃, 버려질 prop, 거부될 호스트 호출을 보고. `--json` 으로 전체 트리.
7. **스크린샷**: `orca plugin shot <plugin-key>` → `.orca/shots/<key>-<panel>.png`. `--theme light|dark`,
   `--width`, `--act '<json>'`(버튼 누르기/입력 등) 지원. 창이 숨겨져 있어도 캡처.
8. **워커 직접 호출**: `orca plugin dev request . connections.list --data '{}'`,
   이벤트 주입 `orca plugin dev emit . workspace.created --data '{...}'`.
9. **로그/디버깅**: `orca plugin logs <publisher.id>`, `orca plugin dev inspect <publisher.id>`(프레임 DevTools),
   `orca plugin dev reload .`, `orca plugin dev unload .`.

## 6. 검증

```sh
orca plugin validate .                 # Orca 설치본
pnpm validate:plugin path/to/plugin    # stablyai/orca 체크아웃에서 (Electron 불필요: pnpm install --ignore-scripts && pnpm run build:packages)
orca plugin inspect .                  # 허용되는 동작과 contentHash
orca plugin release-entry .            # 카탈로그 release 항목 출력 (HEAD 기준)
```

검사 내용: 모르는 키, 제한 초과, 프로필 밖 기여, 사용 필드보다 낮은 `engines.orca`, 매니페스트가 가리키는
모든 파일의 존재와 크기. `publisher` 가 남아 있으면 경고.
종료 코드: `orca plugin` 은 0 정상 / 1 오류 / 2 매니페스트 무효 / 3 승인 필요. `pnpm validate:plugin` 은 0 / 1 무효 / 2 경로 없음.

이 저장소의 `npm run check:manifest`(ajv) 는 Orca 없이 공개 JSON Schema 와 파일 존재만 확인하는 사전 점검이며
Orca 검증기를 대체하지 않습니다. CI(`.github/workflows/validate.yml`)는 둘 다와 `npm run test:node` 를 실행합니다.

## 7. 배포

### 7-1. 커뮤니티 디렉터리 (onorca.dev/plugins) — 기본 경로

1. `orca plugin validate .` 통과, 저장소 소유자(`maximinhan`)의 공개 GitHub 저장소에 커밋·푸시.
2. `orca-plugin.json` 의 `version` 을 올려 커밋한 뒤 그 커밋에 태그: `git tag -a v0.2.0 -m v0.2.0 && git push origin v0.2.0`
   (`vX.Y.Z` 형식).
3. 저장소에 `orca-plugin` 토픽 추가: `gh repo edit maximinhan/orca-db-connector --add-topic orca-plugin`.
4. https://www.onorca.dev/plugins/maximinhan/orca-db-connector 에서 등재 상태 확인.

등재 정책: 무료, 소유자=publisher, 사칭 금지, 안전한 코드(난독화·추적 금지), 선정적 내용 금지. 위반 시 목록 제거,
악성이면 kill list(`https://onorca.dev/plugins/kill-list.json`)로 설치본도 비활성화.

### 7-2. 카탈로그 (선택)

`orca-catalog.json` 을 루트에 둔 Git 저장소. 각 release 는 40자 커밋 SHA 와 `contentHash` 로 고정되며 Orca는
해시가 다른 바이트를 설치하지 않습니다. `orca plugin release-entry .` 출력을 그대로 붙여 넣고(손으로 쓰지 말 것),
새 release 를 `releases` 맨 앞에, `engines.orca` 를 올리면 이전 release 도 남겨 둡니다. 사용자는
Settings → Plugins → ⋯ → **Catalog sources…** 에 Git URL 과 ref 를 추가합니다. 공식 카탈로그(stablyai/orca-plugins)에는
Stably 가 관리하는 플러그인만 들어가며 커뮤니티 플러그인 PR 은 닫힙니다.

### 7-3. 업데이트와 재승인

같은 저장소에서 오는 업데이트가 새 권한을 요구하지 않으면(코드 변경 포함) 재승인 없이 설치되고,
capability 추가·프로필 상향·명령/단축키/패널/이벤트 추가·VM 레시피·저장소 변경이 있으면 Orca가 다시 묻습니다.
자동 업데이트(기본 켜짐)는 등재 12시간 후(공식 카탈로그는 즉시) 설치되며, 고정된 카탈로그 release 만 자동 설치됩니다.

## 8. 이 저장소에서 아직 확인하지 못한 것

- 이 문서를 작성한 클라우드 세션에는 Orca 데스크톱이 없고 Orca 체크아웃의 의존성 설치가 허용되지 않아
  `orca plugin validate/test/check` 와 `pnpm validate:plugin` 을 실행하지 못했습니다. 매니페스트는 공식 JSON
  Schema(ajv)로, 모든 소스는 esbuild 구문 검사로, 드라이버·게이트웨이·훅·MCP 서버·워커 배선은 순수 Node 22 의
  `npm run test:node` 로 확인했습니다. `orca/testing` 테스트(`src/panel.test.tsx`, `src/worker.test.ts`)는
  공식 템플릿과 예제를 따라 작성했으나 실행 전입니다.
- onorca.dev 는 그 세션의 네트워크 정책에서 차단되어, 같은 내용을 담은 `stablyai/orca` 저장소의
  `docs/reference/*.md` 를 사용했습니다.
- 워커 Node 버전과 `node:sqlite` 가용성은 실제 Orca 설치본에서 확인이 필요합니다 (없으면 `orca plugin logs` 에 오류가 찍힘).
- PostgreSQL 과 MySQL 은 닫힌 포트에 대해서만(번들 로드와 깨끗한 실패) 테스트했고 실제 서버에는 아직 붙여 보지 않았습니다.
