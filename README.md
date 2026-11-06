# DB Connector for Orca

[Orca](https://onorca.dev) (Stably의 AI 코딩 에이전트 오케스트레이션 IDE) 플러그인입니다.
오른쪽 사이드바 패널에서 데이터베이스 연결을 저장하고, 연결을 테스트하고, 읽기 전용 쿼리를
실행하는 것이 목표입니다. 비밀번호는 Orca의 암호화된 secrets 저장소에만 보관됩니다.

설치 키는 `maximinhan.db-connector` 입니다 (publisher는 저장소 소유자에서 Orca가 자동으로 정합니다).

> 현재 상태: **스캐폴드(준비 단계)**. 연결 저장/삭제/목록과 패널 UI는 구현되어 있고,
> 실제 DB 드라이버(PostgreSQL, MySQL, SQLite)는 `src/drivers/index.ts` 의 레지스트리에
> 아직 등록되지 않았습니다. 개발 절차 전체는 [docs/orca-plugin-development.md](docs/orca-plugin-development.md) 에 있습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `orca-plugin.json` | 매니페스트(format 2). `trusted-worker` 프로필, 패널 1개, 설정 2개, capability 3개 |
| `src/worker.ts` | 워커 진입점(`main`). `plugin.request` 를 처리하고 DB에 접속한다 (Node 프로세스) |
| `src/panel.tsx` | 사이드바 패널(components UI). 빌드 단계 없음, Orca가 로드 시 트랜스파일 |
| `src/protocol.ts` | 패널 ↔ 워커 요청/이벤트 계약 (양쪽이 타입 검사) |
| `src/connections.ts` | 연결 저장소: 목록은 `storage:own`, 비밀번호는 `secrets:own` |
| `src/drivers/index.ts` | 드라이버 레지스트리 (다음 단계에서 드라이버 추가) |
| `src/*.test.ts(x)`, `src/panel.check.ts` | `orca plugin test .` / `orca plugin check .` 용 |
| `scripts/check-manifest.mjs` | Orca 없이 매니페스트를 공식 JSON Schema로 사전 점검 |
| `.github/workflows/validate.yml` | CI: 스키마 점검 + Orca 자체 검증기(`pnpm validate:plugin`) |

## 개발

Orca 데스크톱 앱이 설치되어 있어야 합니다 (`brew install --cask stablyai/orca/orca` 또는 https://onorca.dev/download).

```sh
orca plugin validate .      # 매니페스트와 진입 파일을 Orca와 같은 규칙으로 검사
orca plugin dev watch .     # 이 폴더를 개발 플러그인으로 로드하고 로그/리로드를 출력 (Ctrl-C로 언로드)
orca plugin types .         # .orca/types 에 타이핑 생성 (dev watch 가 자동으로 수행)
npx tsc -p .                # 타입 검사
orca plugin test .          # src/*.test.ts(x) 를 Node에서 실행
orca plugin check .         # src/panel.check.ts 시나리오별로 패널을 렌더링해 오류 보고
orca plugin shot <key>      # 패널을 PNG로 캡처 (.orca/shots/)
```

처음 로드할 때 Orca는 이 플러그인이 받는 권한(`trusted-worker`, storage/secrets/settings)을 보여주고
승인을 요구합니다. 터미널이 아닌 곳에서 실행하면 `--approve <fingerprint>` 를 붙여 다시 실행하라는
명령을 출력합니다.

Orca 없이 매니페스트만 점검하려면:

```sh
npm ci
npm run check:manifest
```

## 배포 (커뮤니티 디렉터리)

1. `orca plugin validate .` 통과, 변경 사항 커밋/푸시
2. `orca-plugin.json` 의 `version` 을 올려 커밋한 뒤 태그: `git tag -a v0.1.0 -m v0.1.0 && git push origin v0.1.0`
3. 저장소에 `orca-plugin` 토픽 추가: `gh repo edit maximinhan/orca-db-connector --add-topic orca-plugin`
4. 목록 확인: https://www.onorca.dev/plugins/maximinhan/orca-db-connector

## 라이선스

MIT. [LICENSE](LICENSE) 참고.
