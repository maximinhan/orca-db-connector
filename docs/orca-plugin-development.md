# Orca plugin development procedure

[한국어](orca-plugin-development.ko.md)

How a plugin for Orca (https://onorca.dev, GitHub `stablyai/orca`) is developed and published from
this repository, as the official documentation describes it. Every statement below comes from the
`stablyai/orca` repository at commit `554a16f3` (2026-11-05) and `stablyai/orca-plugins` at
commit `1a464704` (2026-11-03).

| Source (stablyai/orca) | Covers |
| --- | --- |
| `docs/reference/plugin-authoring.md` | Write → load → validate → list in the directory → publish to a catalog |
| `docs/reference/plugin-manifest.md`, `docs/schemas/plugins/orca-plugin.v2.schema.json` | Every manifest field and the JSON Schema |
| `docs/reference/plugin-host-api.md` | Host methods a worker or panel may call, events, hooks, error codes |
| `docs/reference/plugin-declarative-ui.md` | Components (TSX) panels, the component catalog, testing |
| `docs/reference/plugin-listing-policy.md` | Rules for the directory and the catalogs |
| `examples/plugins/hello-worker-panel`, `src/cli/plugin-authoring/plugin-worker-panel-template.ts` | What this repository's layout is modelled on |
| (stablyai/orca-plugins) `CONTRIBUTING.md`, `REVIEW_POLICY.md`, `plugins/sqlite-browser` | How the official catalog is run, review criteria, a DB-related official plugin |

## 0. Summary

- Orca plugins are **TypeScript/JavaScript only**. The worker is a separate Node process Orca
  starts (its own Electron binary run with `ELECTRON_RUN_AS_NODE`); panels run in a sandboxed
  webview. Spring/Kotlin cannot be used for the plugin itself (a Kotlin service the worker calls
  over HTTP would be possible).
- Anything that opens **network or database sockets**, like a DB connector, needs the
  `trusted-worker` profile: panel frames have no network at all.
- A plugin is a folder with `orca-plugin.json` at its root, in practice one Git repository.
  Community publishing is automatic from a **GitHub tag plus the `orca-plugin` topic**; pull
  requests adding plugins to the official catalog are closed.
- This repository follows the layout of `orca plugin create <dir> --template worker-panel`, plus
  a hook, a gateway and bundled drivers.

## 1. Execution profile and capabilities

`execution` is the most authority the plugin needs and decides what the user approves. Pick the
lowest that fits.

| Profile | Allows | Note |
| --- | --- | --- |
| `data` | Themes, terminal themes, icon themes, syntaxes, translations | One-click install |
| `declarative` | Commands running Orca actions, shortcuts, VM recipes, status bar items | Reviewed before enabling |
| `sandboxed-ui` | Panels and custom editors (sandboxed frame, `window.orca` only) | No network |
| `trusted-worker` | A `main` worker (Node), event subscriptions, hooks, worker commands | Approved per install |

DB Connector is `trusted-worker`. Declare only the capabilities you use (review rule: "each
requested capability is explained and used").

| Capability | Used for |
| --- | --- |
| `storage:own` | The connection list (JSON) |
| `secrets:own` | Passwords in the OS-keyring-backed encrypted store (`secrets.set` fails when `secrets.protection` is `unavailable`) |
| `settings:own` | The settings declared in `contributes.settings`, edited in Orca's Settings |
| `notifications:show` | A desktop notification when an agent write waits for approval |

Also available: `notifications:show`, `workspace:read`/`workspace:write`, `terminal:send`/
`terminal:read`, `agent:read`/`agent:launch`, `appearance:write`.

Reserved contribution points (empty arrays only): `connections`, `mcpServers`, `taskSources`,
`skills`, `hooks` (agent lifecycle, distinct from the manifest `contributes.hooks` below),
`agentHarnesses`, `sidebarCards`. Offering a database to agents as an MCP server through
`mcpServers` becomes possible once its format ships; until then this plugin injects
`--mcp-config` from the `agent.launch.before` hook (see [agent-access.md](agent-access.md)).

## 2. Manifest rules (`orca-plugin.json`)

- `"manifestVersion": 2` is required. Unknown keys at any depth are refused (strict).
- **Leave `publisher` out.** Orca derives it from where the plugin is installed from: the GitHub
  owner → `maximinhan`, a development folder → `local`. Leaving it out needs `engines.orca`
  `>=1.4.246` or newer.
- `id` is kebab-case. The `orca-` prefix and the owners `stablyai`, `official`, `anthropic`,
  `openai`, `github` and `orca*` are reserved.
- `engines.orca` must be the newest "Since" of every field you use. This repository needs
  `>=1.4.248` (`contributes.hooks` 1.4.248; `contributes.settings` 1.4.246; the `Callout`,
  `Table`, `Tree`, `Textarea`, `Checkbox`, `KeyValue`, `Collapsible` components 1.4.247).
- `pluginApi: 1` only when a panel or worker calls the host API (refused on `data`/`declarative`).
- `main` is a `.js`/`.mjs` or `.ts`/`.mts` module (transpiled by Orca, no build). **No `.tsx` worker.**
- `license` is an SPDX expression; keep a matching `LICENSE` file (review item).
- `contributes.hooks` entries name a hook (`agent.launch.before` here) and `onError`
  (`pass` or `deny`). With a hook, Orca starts the worker when the plugin is enabled and keeps it
  running, which is what keeps the agent gateway up.
- Editor completion: put the published schema URL in `$schema` (ignored by Orca).
- Images: `icon` PNG/WEBP square ≥128px ≤256 KB; `cover` ≥800×500 (1600×1000 recommended)
  ≤1024 KB; up to six `screenshots` ≥1280×800 ≤1536 KB; 8 MB in all. Real plugin UI only, no
  fake trust badges.

## 3. Code structure

### Worker (`src/worker.ts`)

- The **default export** must be `activate(orca)` (a named export fails the start);
  `export function deactivate()` is optional.
- The object it receives: `orca.api`, `orca.host.call/has`, `orca.commands.register`,
  `orca.events.on`, `orca.hooks.on`, `orca.panels.handle/post`,
  `orca.storage.get/set/delete/keys/onDidChange`, `orca.settings.get/set/onDidChange`,
  `orca.secrets.get/set/delete`, `orca.grantedCapabilities`, `orca.log`.
- Without hooks or status bar items a worker stops when idle and restarts on the next request or
  event, losing in-memory state: keep what must last in storage.
- An error a handler throws reaches the panel's `plugin.request` as a rejection with its `code`.
  Known codes (`invalid_params`, `conflict`, `unavailable`, `timeout`, `not_permitted`, ...) are
  kept; anything else becomes `action_failed`.
- Request input ≤64 KiB, answer ≤1 MiB, `post` ≤256 KiB and 200 per 10 s. Request timeout 30 s by
  default, 120 s at most.
- Hooks: `orca.hooks.on(hook, (event, next) => ...)`; return `next(changedEvent)` to go on,
  `{ deny: reason }` to stop, nothing to pass. A handler has 2 s. Decide before any awaited host
  call (this plugin caches its settings for that reason).
- Relative imports resolve with or without extension (`./util` → `util.ts`; `./util.ts` also
  works). `node:` builtins and packages resolve as Node does. `orca/worker` is types only:
  `import type`.
- Workers are Node with full access: they may listen on sockets, read files and spawn processes.
  That is why `trusted-worker` is approved per install.

### Panel (`src/panel.tsx`, `ui: "components"`)

- The default export is a component function. No hooks; state in `atom`/`derived`/`read`/
  `set`/`update`.
- Imports are limited to `orca`, `orca/*` and relative files. A bare package such as `react`
  fails to load; bundle with esbuild and point `entry` at the `.js` if you need npm packages
  (`--external:orca --external:'orca/*' --jsx=automatic --jsx-import-source=orca`).
- Components are named imports from `orca`. Base catalog: `Stack Row Text Heading Button
  IconButton Badge Card List ListItem Input Switch Select Separator Progress Spinner EmptyState
  Link Code`. Added in 1.4.247: `Textarea Checkbox RadioGroup Slider Field Tabs Tab Collapsible
  Toolbar Grid Table Tree Markdown CodeView Image KeyValue Callout Skeleton RelativeTime`. Added
  in 1.4.248: `Box`. For a component newer than your minimum, check `ui.has('Table')` and create
  it with `h('Table', …)`.
- Render limits: 5000 nodes, depth 64, about 512 KiB, 16 KiB per text, 500 `Select` options,
  5000 `Table` rows.
- `shell.openExternal`/`files.saveAs` need a real press on a Button, IconButton, ListItem or Link
  within 1 s.
- Panel ↔ worker: panel `plugin.request(name, input, { timeoutMs })` ↔ worker
  `orca.panels.handle(name, fn)`; worker `orca.panels.post(event, payload)` ↔ panel
  `plugin.on(event, fn)`. Declare the contract once in `src/protocol.ts` with
  `declare module 'orca' { interface PluginRequests / PluginPanelEvents }`.
- Shared data: `atom(key, init, { persist: 'storage' })` is the same value the worker reads with
  `orca.storage.get(key)`. `persist: 'plugin'`/`'workspace'` is panel-only persisted state (no
  capability needed).

## 4. Dependencies and size limits (what the bundled drivers follow)

- An install copies and **hashes every file** except the root `.git/`. Development folders skip
  `node_modules/`, `.orca/` and `.git/`, but an installed plugin has no `node_modules`, so **npm
  packages must be bundled and committed**. This repository does that in `build/` → `vendor/`
  (`pg.cjs`, `mysql2.cjs`), loaded with `createRequire`.
- Limits: 2,000 files and 50 MiB per folder; panel/editor entry 10 MiB; each transpiled
  `.ts/.tsx` file 1 MiB; **1 MiB per file for a catalog listing**.
- Policy: no obfuscated or minified-to-hide code; bundled output is fine when its source is in the
  repository. The official catalog review refuses compiled executables and native modules. No
  tracking or data collection. No paid features (connecting to the user's own paid service is fine).
- Precedent `plugins/sqlite-browser`: `build/` (package.json, esbuild, tests) produces a committed
  output folder, `.gitattributes` marks it `linguist-generated`, `THIRD_PARTY_NOTICES.txt` lists
  bundled licences, and the build fails on files over 1 MiB or on `eval`/`Function`.

Driver choices made here:

| Driver | How | Notes |
| --- | --- | --- |
| SQLite | Node built-in `node:sqlite` | No dependency, no build. Needs the worker's Node ≥22.13 (unflagged `node:sqlite`); Orca ships Electron 43 |
| PostgreSQL | `pg` bundled by esbuild (`platform=node`, CommonJS, not minified) | 170 KB; `pg-native` stays external |
| MySQL/MariaDB | `mysql2/promise` bundled with shims for `iconv-lite` and `aws-ssl-profiles` | 576 KB; utf8/latin1/ascii/ucs2 charsets only |
| Native modules (`better-sqlite3`, `pg-native`) | not possible | Binaries are refused and would not match the install hash |

## 5. Development loop

1. **Install the Orca desktop app**: `brew install --cask stablyai/orca/orca` (bare `orca` is an
   unrelated Plotly cask) or https://onorca.dev/download. The `orca` CLI comes with it. Loading
   panels and workers, screenshots and approvals need the desktop app; `orca serve` in a browser
   shows no components panels.
2. **(New plugin)** `orca plugin create <dir> --template worker-panel`. Templates: `theme |
   terminal-theme | icon-theme | syntax | language-pack | editor | panel | components |
   worker-panel`. This repository already has that layout.
3. **Load**: from the plugin folder, `orca plugin dev watch .`
   - Writes `.orca/types`, loads the folder as the development plugin `local.db-connector`,
     prints logs and `↻ reloaded`.
   - The first load needs approval: in a terminal `Approve and load? [y/N]`; non-interactive
     (agent, pipe, `--json`) exits 3 and prints `orca plugin dev reload . --approve
     <fingerprint>`. It never approves by itself.
   - Adding a capability, raising the profile or changing commands/shortcuts needs a new
     approval. Panel and worker code changes hot-reload without one (the worker restarts and
     loses memory state; this plugin's gateway token changes with it).
   - GUI alternative: Settings → Plugins → **Turn on plugins** → **Development folders…** → add the
     folder → review and enable.
4. **Type check**: `orca plugin types .` (dev watch does it) then `npx tsc -p .`. `tsconfig.json`
   extends `./.orca/types/tsconfig.json`; `.orca/` is never committed. This repository adds
   `allowImportingTsExtensions` because worker-side files import with `.ts` so plain Node can run
   their tests.
5. **Tests**: `orca plugin test .` runs `src/*.test.ts(x)` with Node's `node:test`, resolving
   `orca/testing` (`mount` for panels, `mountWorker` for workers, `mockHost({ storage, settings,
   secrets, requests, results })`, `mockEditorHost`). Tests and check run outside the sandbox with
   your full access: only on code you trust. `npm run test:node` runs the subset that needs no
   Orca at all.
6. **Render check**: `orca plugin check .` renders each `src/panel.check.ts` scenario and reports
   `file:line` errors, refused layouts, dropped props and refused host calls; `--json` adds the tree.
7. **Screenshots**: `orca plugin shot <plugin-key>` → `.orca/shots/<key>-<panel>.png`, with
   `--theme light|dark`, `--width`, `--act '<json>'` (presses, typing). Captures the hidden window.
8. **Call the worker directly**: `orca plugin dev request . connections.list --data '{}'`; inject
   an event with `orca plugin dev emit . workspace.created --data '{...}'`.
9. **Logs and debugging**: `orca plugin logs <publisher.id>`, `orca plugin dev inspect
   <publisher.id>` (frame DevTools), `orca plugin dev reload .`, `orca plugin dev unload .`.

## 6. Validation

```sh
orca plugin validate .                 # with Orca installed
pnpm validate:plugin path/to/plugin    # from a stablyai/orca checkout (no Electron: pnpm install --ignore-scripts && pnpm run build:packages)
orca plugin inspect .                  # what it would be allowed to do, and its contentHash
orca plugin release-entry .            # the catalog release entry for HEAD
```

Checked: unknown keys, limits, contributions beyond the profile, an `engines.orca` lower than the
fields used, and the existence and size of every file the manifest names. A remaining
`publisher` is a warning. Exit codes: `orca plugin` 0 ok / 1 error / 2 invalid manifest / 3
approval needed; `pnpm validate:plugin` 0 / 1 invalid / 2 no path.

`npm run check:manifest` (ajv) in this repository checks only the published JSON Schema and file
existence without Orca; it does not replace Orca's validator. CI
(`.github/workflows/validate.yml`) runs both, plus `npm run test:node`.

## 7. Publishing

### 7-1. Community directory (onorca.dev/plugins), the default route

1. `orca plugin validate .` passes; the plugin is committed and pushed to the public GitHub
   repository of the owner (`maximinhan`).
2. Bump `version` in `orca-plugin.json`, commit, then tag that commit: `git tag -a v0.2.0 -m
   v0.3.0 && git push origin v0.3.0` (`vX.Y.Z`).
3. Add the `orca-plugin` topic: `gh repo edit maximinhan/orca-db-connector --add-topic orca-plugin`.
4. Check the listing at https://www.onorca.dev/plugins/maximinhan/orca-db-connector.

Listing policy: free, publisher = owner, no impersonation, safe code (no obfuscation or tracking),
no explicit content. Violations are delisted; malicious plugins go on the kill list
(`https://onorca.dev/plugins/kill-list.json`), which also disables installed copies.

### 7-2. A catalog (optional)

A Git repository with `orca-catalog.json` at its root. Each release is pinned to a 40-character
commit SHA and a `contentHash`; Orca refuses bytes that differ. Paste the output of `orca plugin
release-entry .` (never write it by hand), newest release first, and keep the previous release
when you raise `engines.orca`. Users add the catalog under Settings → Plugins → ⋯ → **Catalog
sources…** with its Git URL and ref. The official catalog (stablyai/orca-plugins) holds only
plugins Stably maintains; community pull requests are closed.

### 7-3. Updates and re-approval

An update from the same repository that asks for nothing new (code changes included) installs
without asking again. Orca asks again when an update adds a capability, raises the profile, adds a
command, shortcut, panel or event subscription, ships VM recipes, or comes from another
repository. Automatic updates (on by default) install a release 12 hours after it is listed
(official catalog: at once); only pinned catalog releases install by themselves.

## 8. Not verified in this repository's sessions

- The Orca desktop app is not available in the cloud session this was written in, and installing
  the Orca checkout's dependencies was not allowed there, so `orca plugin validate/test/check`
  and `pnpm validate:plugin` have not been run yet. The manifest was checked against the official
  JSON Schema with ajv, every source with an esbuild syntax pass, and the drivers, gateway, hook,
  MCP server and worker wiring with `npm run test:node` in plain Node 22. The `orca/testing`
  tests (`src/panel.test.tsx`, `src/worker.test.ts`) follow the official template and examples
  but have not been executed.
- onorca.dev was blocked by that session's network policy; the same content was read from
  `docs/reference/*.md` in the `stablyai/orca` repository.
- The exact Node version of Orca's worker, and so `node:sqlite` availability, still needs a check
  on a real Orca install (`orca plugin logs` prints the error if it is missing).
- PostgreSQL and MySQL were tested only against a closed port (the bundles load and fail cleanly),
  not against live servers.
