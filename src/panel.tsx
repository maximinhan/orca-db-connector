// Right-sidebar panel. No build step: Orca strips the types and compiles the JSX when it loads.
// Only `orca` and relative files may be imported here (no bare npm packages).
import {
  atom,
  Badge,
  Button,
  Callout,
  Checkbox,
  CodeView,
  Collapsible,
  EmptyState,
  env,
  Heading,
  Input,
  KeyValue,
  List,
  ListItem,
  plugin,
  read,
  RelativeTime,
  Row,
  Select,
  set,
  Spinner,
  Stack,
  Table,
  Text,
  Textarea,
  Tree,
  type PanelContext
} from 'orca'
import { strings } from './i18n'
import {
  DB_DRIVER_KINDS,
  type ApprovalRequest,
  type DbConnection,
  type DbCredentials,
  type DbDriverKind,
  type GatewayStatus,
  type QueryLogEntry,
  type QueryResult,
  type RunningAgent,
  type SchemaTable
} from './protocol'

type Note = { tone: 'neutral' | 'success' | 'danger'; text: string }

const DRIVER_OPTIONS = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL / MariaDB' },
  { value: 'sqlite', label: 'SQLite (file)' }
]
const DEFAULT_PORTS: Record<DbDriverKind, number> = { postgres: 5432, mysql: 3306, sqlite: 0 }

/** What the worker last answered; filled by setup() and after each change. */
const connections = atom<DbConnection[]>([])
/** The connection being edited; `persist: 'plugin'` keeps it across panel runs. */
const selectedId = atom<string | null>('selectedId', null, { persist: 'plugin' })
const note = atom<Note | null>(null)
const busy = atom(false)
const gateway = atom<GatewayStatus | null>(null)
const approvals = atom<ApprovalRequest[]>([])
const runningAgents = atom<RunningAgent[]>([])
const agentNote = atom<Note | null>(null)

// Keyed memory atoms: a half-typed form survives a hot reload while developing.
const draftName = atom('draft.name', '')
const draftDriver = atom<DbDriverKind>('draft.driver', 'postgres')
const draftHost = atom('draft.host', 'localhost')
const draftPort = atom('draft.port', '5432')
const draftDatabase = atom('draft.database', '')
const draftUser = atom('draft.user', '')
const draftPassword = atom('draft.password', '')
const draftEnvironment = atom('draft.environment', '')
const draftAgent = atom('draft.agent', true)
const draftAgentWritesAlways = atom('draft.agentWritesAlways', false)
const draftDangerous = atom('draft.dangerous', false)
const draftCredentialSource = atom<DbCredentials['source']>('draft.credentialSource', 'password')
const draftAwsSecretId = atom('draft.awsSecretId', '')
const draftAwsRegion = atom('draft.awsRegion', '')
const draftAwsProfile = atom('draft.awsProfile', '')

// Query console.
const sql = atom('sql', '')
const allowWrites = atom(false)
/** A write on a dangerous connection waits here for a second press. */
const pendingDangerousWrite = atom(false)
const result = atom<QueryResult | null>(null)
const queryError = atom<string | null>(null)
const schema = atom<SchemaTable[] | null>(null)

// Activity log.
const logEntries = atom<QueryLogEntry[]>([])
const logSelectedId = atom<string | null>(null)
const logResult = atom<QueryResult | null>(null)

function describe(connection: DbConnection): string {
  if (connection.driver === 'sqlite') {
    return `sqlite:${connection.database || '(no file)'}`
  }
  if (connection.credentials.source === 'aws-secrets-manager') {
    return `${connection.driver} via AWS secret ${connection.credentials.secretId}`
  }
  const user = connection.user ? `${connection.user}@` : ''
  return `${connection.driver}://${user}${connection.host}:${connection.port}/${connection.database}`
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function newId(): string {
  return `conn-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`
}

function fail(error: unknown): void {
  set(note, { tone: 'danger', text: errorText(error) })
}

async function refresh(): Promise<void> {
  const answer = await plugin.request('connections.list')
  set(connections, answer.connections)
}

async function refreshGateway(): Promise<void> {
  set(gateway, await plugin.request('gateway.status'))
}

async function refreshApprovals(): Promise<void> {
  set(approvals, (await plugin.request('approvals.list')).approvals)
}

async function refreshAgents(): Promise<void> {
  set(runningAgents, (await plugin.request('agents.list')).agents)
}

async function refreshLog(): Promise<void> {
  const { entries } = await plugin.request('log.list')
  set(logEntries, entries)
  const selected = read(logSelectedId)
  if (selected !== null && !entries.some((entry) => entry.id === selected)) {
    set(logSelectedId, null)
    set(logResult, null)
  }
}

function clearDraft(): void {
  set(selectedId, null)
  set(draftName, '')
  set(draftDriver, 'postgres')
  set(draftHost, 'localhost')
  set(draftPort, String(DEFAULT_PORTS.postgres))
  set(draftDatabase, '')
  set(draftUser, '')
  set(draftPassword, '')
  set(draftEnvironment, '')
  set(draftAgent, true)
  set(draftAgentWritesAlways, false)
  set(draftDangerous, false)
  set(draftCredentialSource, 'password')
  set(draftAwsSecretId, '')
  set(draftAwsRegion, '')
  set(draftAwsProfile, '')
  set(note, null)
  set(result, null)
  set(queryError, null)
  set(schema, null)
  set(pendingDangerousWrite, false)
}

function select(connection: DbConnection): void {
  set(selectedId, connection.id)
  set(draftName, connection.name)
  set(draftDriver, connection.driver)
  set(draftHost, connection.host)
  set(draftPort, String(connection.port))
  set(draftDatabase, connection.database)
  set(draftUser, connection.user)
  set(draftPassword, '')
  set(draftEnvironment, connection.environment)
  set(draftAgent, connection.agent)
  set(draftAgentWritesAlways, connection.agentWrites === 'always')
  set(draftDangerous, connection.dangerous)
  const credentials = connection.credentials
  set(draftCredentialSource, credentials.source)
  set(draftAwsSecretId, credentials.source === 'aws-secrets-manager' ? credentials.secretId : '')
  set(draftAwsRegion, credentials.source === 'aws-secrets-manager' ? credentials.region : '')
  set(draftAwsProfile, credentials.source === 'aws-secrets-manager' ? credentials.profile : '')
  set(note, null)
  set(result, null)
  set(queryError, null)
  set(schema, null)
  set(pendingDangerousWrite, false)
}

function changeDriver(value: string): void {
  const driver = (DB_DRIVER_KINDS as readonly string[]).includes(value) ? (value as DbDriverKind) : 'postgres'
  set(draftDriver, driver)
  set(draftPort, String(DEFAULT_PORTS[driver]))
}

async function save(): Promise<void> {
  const t = strings()
  const name = read(draftName).trim()
  if (name === '') {
    set(note, { tone: 'danger', text: t.needName })
    return
  }
  const aws = read(draftDriver) !== 'sqlite' && read(draftCredentialSource) === 'aws-secrets-manager'
  const port = aws ? 0 : Number(read(draftPort))
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    set(note, { tone: 'danger', text: t.needPort })
    return
  }
  if (aws && read(draftAwsSecretId).trim() === '') {
    set(note, { tone: 'danger', text: t.needSecret })
    return
  }
  const credentials: DbCredentials = aws
    ? { source: 'aws-secrets-manager', secretId: read(draftAwsSecretId).trim(), region: read(draftAwsRegion).trim(), profile: read(draftAwsProfile).trim() }
    : { source: 'password' }
  const connection: DbConnection = {
    id: read(selectedId) ?? newId(),
    name,
    driver: read(draftDriver),
    host: aws ? '' : read(draftHost).trim(),
    port,
    database: aws ? '' : read(draftDatabase).trim(),
    user: aws ? '' : read(draftUser).trim(),
    environment: read(draftEnvironment).trim(),
    agent: read(draftAgent),
    agentWrites: read(draftAgentWritesAlways) ? 'always' : 'ask',
    dangerous: read(draftDangerous),
    credentials
  }
  const password = aws ? '' : read(draftPassword)
  set(busy, true)
  try {
    // Typed by src/protocol.ts; starts the worker if it is not running.
    await plugin.request('connections.save', {
      connection,
      ...(password === '' ? {} : { password })
    })
    set(selectedId, connection.id)
    set(draftPassword, '')
    set(note, { tone: 'success', text: t.savedNote(connection.name) })
    await refresh()
  } catch (error) {
    fail(error)
  } finally {
    set(busy, false)
  }
}

async function test(): Promise<void> {
  const id = read(selectedId)
  if (id === null) {
    return
  }
  set(busy, true)
  set(note, { tone: 'neutral', text: strings().connecting })
  try {
    const answer = await plugin.request('connections.test', { id }, { timeoutMs: 60_000 })
    set(note, { tone: answer.ok ? 'success' : 'danger', text: `${answer.message} (${answer.durationMs} ms)` })
  } catch (error) {
    fail(error)
  } finally {
    set(busy, false)
  }
}

async function remove(): Promise<void> {
  const id = read(selectedId)
  if (id === null) {
    return
  }
  set(busy, true)
  try {
    await plugin.request('connections.remove', { id })
    clearDraft()
    set(note, { tone: 'neutral', text: strings().removed })
    await refresh()
  } catch (error) {
    fail(error)
  } finally {
    set(busy, false)
  }
}

function selectedConnection(): DbConnection | null {
  const id = read(selectedId)
  return read(connections).find((connection) => connection.id === id) ?? null
}

async function runQuery(confirmed = false): Promise<void> {
  const connection = selectedConnection()
  const text = read(sql).trim()
  if (connection === null || text === '') {
    return
  }
  // A dangerous connection with writes allowed: the first press only asks for the second.
  if (connection.dangerous && read(allowWrites) && !confirmed) {
    set(pendingDangerousWrite, true)
    return
  }
  set(pendingDangerousWrite, false)
  set(busy, true)
  set(queryError, null)
  try {
    const answer = await plugin.request(
      'query.run',
      { id: connection.id, sql: text, allowWrites: read(allowWrites), confirmed },
      { timeoutMs: 120_000 }
    )
    set(result, answer)
  } catch (error) {
    set(result, null)
    set(queryError, errorText(error))
  } finally {
    set(busy, false)
  }
}

async function loadSchema(): Promise<void> {
  const id = read(selectedId)
  if (id === null) {
    return
  }
  set(busy, true)
  set(queryError, null)
  try {
    const answer = await plugin.request('schema.list', { id }, { timeoutMs: 60_000 })
    set(schema, answer.tables)
  } catch (error) {
    set(queryError, errorText(error))
  } finally {
    set(busy, false)
  }
}

async function decide(id: string, approve: boolean): Promise<void> {
  try {
    await plugin.request('approvals.decide', { id, approve })
    await refreshApprovals()
  } catch (error) {
    fail(error)
  }
}

async function connectAgent(agent: RunningAgent): Promise<void> {
  try {
    await plugin.request('agents.connect', { terminalId: agent.terminalId })
    set(agentNote, { tone: 'success', text: strings().connected(agent.title) })
  } catch (error) {
    set(agentNote, { tone: 'danger', text: errorText(error) })
  }
}

async function showLogEntry(entry: QueryLogEntry): Promise<void> {
  if (read(logSelectedId) === entry.id) {
    set(logSelectedId, null)
    set(logResult, null)
    return
  }
  set(logSelectedId, entry.id)
  set(logResult, null)
  if (entry.hasResult) {
    try {
      set(logResult, (await plugin.request('log.result', { id: entry.id })).result)
    } catch (error) {
      fail(error)
    }
  }
}

async function clearLog(): Promise<void> {
  try {
    await plugin.request('log.clear')
    set(logSelectedId, null)
    set(logResult, null)
    await refreshLog()
  } catch (error) {
    fail(error)
  }
}

/** Runs once before the first render; what it pushes to `subscriptions` ends with the panel. */
export function setup(ctx: PanelContext): void {
  ctx.subscriptions.push(
    plugin.on('connections.changed', () => void refresh().catch(fail)),
    plugin.on('approvals.changed', () => void refreshApprovals().catch(fail)),
    plugin.on('log.changed', () => void refreshLog().catch(fail))
  )
  void plugin.request('ui.hello', { locale: env.locale ?? 'en' }).catch(() => undefined)
  void refresh().catch(fail)
  void refreshGateway().catch(() => set(gateway, null))
  void refreshApprovals().catch(() => set(approvals, []))
  void refreshAgents().catch(() => set(runningAgents, []))
  void refreshLog().catch(() => set(logEntries, []))
}

function accessLabel(access: GatewayStatus['agentAccess']): string {
  const t = strings()
  return access === 'off' ? t.accessOff : access === 'read-only' ? t.accessReadOnly : t.accessReadWrite
}

function Approvals() {
  const t = strings()
  const waiting = read(approvals)
  if (waiting.length === 0) {
    return null
  }
  return (
    <Stack gap="sm">
      {waiting.map((request) => (
        <Callout
          key={request.id}
          tone={request.dangerous ? 'danger' : 'warning'}
          title={t.agentWantsToWrite(request.agent ?? t.anAgent, `${request.connectionName}${request.environment ? ` (${request.environment})` : ''}`)}
        >
          <Stack gap="xs">
            {request.dangerous ? (
              <Text tone="danger" weight="semibold">
                {t.dangerousEnvironment}
              </Text>
            ) : null}
            <CodeView code={request.sql} language="sql" label={t.statement} maxHeight="sm" />
            <Row gap="xs" justify="between">
              <Text muted size="xs">
                {t.askedExpires} <RelativeTime at={request.createdAt} />, {t.expires} <RelativeTime at={request.expiresAt} />
              </Text>
              <Row gap="xs">
                <Button tone="danger" icon="close" onPress={() => void decide(request.id, false)}>
                  {t.refuse}
                </Button>
                <Button tone={request.dangerous ? 'danger' : 'accent'} icon="check" onPress={() => void decide(request.id, true)}>
                  {t.approve}
                </Button>
              </Row>
            </Row>
          </Stack>
        </Callout>
      ))}
    </Stack>
  )
}

function GatewaySection() {
  const t = strings()
  const status = read(gateway)
  if (status === null) {
    return null
  }
  if (!status.running) {
    return (
      <Callout tone="warning" title={t.gatewayNotRunning}>
        {status.error ?? t.gatewayNotRunningBody}
      </Callout>
    )
  }
  const agents = read(runningAgents)
  const message = read(agentNote)
  return (
    <Collapsible title={t.agentAccess} description={t.gatewayDescription(status.url ?? '', accessLabel(status.agentAccess))}>
      <Stack gap="sm">
        <KeyValue
          label={t.agentAccess}
          items={[
            { label: t.gateway, value: status.url ?? '', code: true },
            { label: t.access, value: accessLabel(status.agentAccess) },
            { label: t.mcpServer, value: status.mcpServerPath, code: true }
          ]}
        />
        <Text muted size="xs">
          {t.gatewayHelp}
        </Text>
        <Row justify="between">
          <Heading level={3}>{t.runningAgents}</Heading>
          <Button variant="ghost" icon="refresh" onPress={() => void refreshAgents().catch(fail)}>
            {t.refresh}
          </Button>
        </Row>
        <Text muted size="xs">
          {t.runningAgentsHelp}
        </Text>
        {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}
        {agents.length === 0 ? (
          <Text muted>{t.noRunningAgents}</Text>
        ) : (
          <List label={t.runningAgents}>
            {agents.map((agent) => (
              <ListItem key={agent.terminalId} title={agent.title} description={`${agent.agent ?? t.agent} · ${agent.state}`} icon="agent">
                <Button
                  variant="outline"
                  icon="link"
                  onPress={() => void connectAgent(agent)}
                  disabled={status.agentAccess === 'off'}
                >
                  {t.connect}
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Collapsible>
  )
}

function SchemaTree() {
  const t = strings()
  const tables = read(schema)
  if (tables === null) {
    return null
  }
  if (tables.length === 0) {
    return <Text muted>{t.noTables}</Text>
  }
  return (
    <Tree
      label={t.tablesAndViews}
      items={tables.map((table) => ({
        key: `${table.schema ?? ''}.${table.name}`,
        label: table.schema ? `${table.schema}.${table.name}` : table.name,
        description: `${table.kind}, ${t.columns(table.columns.length)}`,
        icon: table.kind === 'view' ? 'file' : 'database',
        children: table.columns.map((column) => ({
          key: `${table.schema ?? ''}.${table.name}.${column.name}`,
          label: column.name,
          description: `${column.type}${column.primaryKey ? `, ${t.primaryKey}` : ''}${column.nullable ? '' : `, ${t.notNull}`}`
        }))
      }))}
    />
  )
}

function ResultView({ answer, label }: { answer: QueryResult | null; label: string }) {
  const t = strings()
  if (answer === null) {
    return null
  }
  if (answer.columns.length === 0) {
    return (
      <Text tone="success">
        {answer.message ?? t.rowsChanged(answer.rowCount)} ({answer.durationMs} ms)
      </Text>
    )
  }
  return (
    <Stack gap="xs">
      <Table
        label={label}
        columns={answer.columns.map((column) => ({ key: column, label: column, minWidth: 'xs' }))}
        rows={answer.rows.map((row, index) => ({ key: String(index), cells: row }))}
        emptyText={t.noRows}
      />
      <Text muted size="xs">
        {t.rowsSummary(answer.rowCount, answer.truncated, answer.durationMs)}
      </Text>
    </Stack>
  )
}

function statusTone(entry: QueryLogEntry): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (entry.status !== 'ok' || entry.dangerous) {
    return 'danger'
  }
  return entry.kind === 'write' ? 'warning' : 'neutral'
}

function statusLabel(entry: QueryLogEntry): string {
  const t = strings()
  return entry.status === 'ok' ? t.statusOk : entry.status === 'error' ? t.statusError : entry.status === 'denied' ? t.statusDenied : t.statusTimeout
}

function ActivityLog() {
  const t = strings()
  const entries = read(logEntries)
  const selected = read(logSelectedId)
  const current = entries.find((entry) => entry.id === selected) ?? null
  return (
    <Collapsible title={t.activity} description={t.queriesLogged(entries.length)}>
      <Stack gap="sm">
        {entries.length === 0 ? (
          <Text muted>{t.activityEmpty}</Text>
        ) : (
          <List label={t.queries}>
            {entries.slice(0, 50).map((entry) => (
              <ListItem
                key={entry.id}
                title={entry.sql.length > 80 ? `${entry.sql.slice(0, 80)}…` : entry.sql}
                description={`${entry.source === 'agent' ? (entry.agent ?? t.agent) : t.panel} · ${entry.connectionName}${entry.environment ? ` (${entry.environment})` : ''} · ${entry.status === 'ok' ? `${entry.rowCount} ${t.rows}` : statusLabel(entry)} · ${entry.durationMs} ms`}
                icon={entry.dangerous ? 'warning' : entry.kind === 'write' ? 'edit' : 'search'}
                current={entry.id === selected}
                onPress={() => void showLogEntry(entry)}
              >
                <Row gap="xs" wrap>
                  {entry.dangerous ? <Badge tone="danger">{t.dangerousUpper}</Badge> : null}
                  <Badge tone={statusTone(entry)}>{entry.kind === 'write' ? t.kindWrite : t.kindRead}</Badge>
                  {entry.status !== 'ok' ? <Badge tone="danger">{statusLabel(entry)}</Badge> : null}
                  {entry.approval === 'approved' ? <Badge tone="accent">{t.approved}</Badge> : null}
                  <Text muted size="xs">
                    <RelativeTime at={entry.at} />
                  </Text>
                </Row>
              </ListItem>
            ))}
          </List>
        )}
        {current ? (
          <Stack gap="xs">
            <CodeView code={current.sql} language="sql" label={t.sql} maxHeight="sm" />
            {current.error ? <Callout tone="danger">{current.error}</Callout> : null}
            {current.status === 'ok' && !current.hasResult ? (
              <Text muted size="xs">
                {t.rowsGone}
              </Text>
            ) : null}
            <ResultView answer={read(logResult)} label={t.loggedResult} />
          </Stack>
        ) : null}
        <Row justify="end">
          <Button variant="ghost" icon="delete" onPress={() => void clearLog()} disabled={entries.length === 0}>
            {t.clearLog}
          </Button>
        </Row>
      </Stack>
    </Collapsible>
  )
}

export default function Panel() {
  const t = strings()
  const list = read(connections)
  const selected = read(selectedId)
  const current = selectedConnection()
  const message = read(note)
  const working = read(busy)
  const isSqlite = read(draftDriver) === 'sqlite'
  const failure = read(queryError)
  const dangerous = read(draftDangerous)
  const awsCredentials = read(draftCredentialSource) === 'aws-secrets-manager'
  const credentialOptions = [
    { value: 'password', label: t.credentialPassword },
    { value: 'aws-secrets-manager', label: t.credentialAws }
  ]
  return (
    <Stack gap="md">
      <Row justify="between">
        <Heading>{t.connections}</Heading>
        <Badge tone={list.length > 0 ? 'accent' : 'neutral'}>{t.saved(list.length)}</Badge>
      </Row>

      <Approvals />
      <GatewaySection />

      {list.length === 0 ? (
        <EmptyState title={t.noConnectionsTitle} description={t.noConnectionsBody} icon="database" />
      ) : (
        <List label={t.savedConnections}>
          {list.map((connection) => (
            <ListItem
              key={connection.id}
              title={connection.name}
              description={describe(connection)}
              icon={connection.dangerous ? 'warning' : 'database'}
              current={connection.id === selected}
              onPress={() => select(connection)}
            >
              <Row gap="xs" wrap>
                {connection.environment ? <Badge tone={connection.dangerous ? 'danger' : 'accent'}>{connection.environment}</Badge> : null}
                {connection.dangerous ? <Badge tone="danger">{t.dangerous}</Badge> : null}
                {connection.agent ? (
                  <Badge tone={connection.agentWrites === 'always' ? 'warning' : 'neutral'}>
                    {connection.agentWrites === 'always' ? t.agentsWrite : t.agentsAsk}
                  </Badge>
                ) : (
                  <Badge tone="neutral">{t.hiddenFromAgents}</Badge>
                )}
              </Row>
            </ListItem>
          ))}
        </List>
      )}

      <Row justify="between">
        <Heading level={3}>{selected === null ? t.newConnection : t.editConnection}</Heading>
        {current?.dangerous ? <Badge tone="danger">{t.dangerousUpper}</Badge> : null}
      </Row>
      <Input label={t.name} value={read(draftName)} onChange={(value) => set(draftName, value)} />
      <Input
        label={t.environmentLabel}
        placeholder={t.environmentPlaceholder}
        maxLength={32}
        value={read(draftEnvironment)}
        onChange={(value) => set(draftEnvironment, value)}
      />
      <Select label={t.driver} value={read(draftDriver)} options={DRIVER_OPTIONS} onChange={changeDriver} />
      {isSqlite ? null : (
        <Select
          label={t.credentials}
          value={read(draftCredentialSource)}
          options={credentialOptions}
          onChange={(value) => set(draftCredentialSource, value === 'aws-secrets-manager' ? 'aws-secrets-manager' : 'password')}
        />
      )}
      {isSqlite || awsCredentials ? null : (
        <Row gap="xs">
          <Input label={t.host} value={read(draftHost)} onChange={(value) => set(draftHost, value)} />
          <Input label={t.port} value={read(draftPort)} onChange={(value) => set(draftPort, value)} />
        </Row>
      )}
      {!isSqlite && awsCredentials ? null : (
        <Input
          label={isSqlite ? t.databaseFile : t.database}
          placeholder={isSqlite ? '~/data/app.db' : ''}
          value={read(draftDatabase)}
          onChange={(value) => set(draftDatabase, value)}
        />
      )}
      {isSqlite || awsCredentials ? null : <Input label={t.user} value={read(draftUser)} onChange={(value) => set(draftUser, value)} />}
      {isSqlite || awsCredentials ? null : (
        <Input
          label={t.password}
          type="password"
          value={read(draftPassword)}
          placeholder={selected === null ? '' : t.passwordKeep}
          onChange={(value) => set(draftPassword, value)}
        />
      )}
      {isSqlite || !awsCredentials ? null : (
        <Stack gap="xs">
          <Input
            label={t.awsSecretId}
            placeholder={t.awsSecretPlaceholder}
            value={read(draftAwsSecretId)}
            onChange={(value) => set(draftAwsSecretId, value)}
          />
          <Row gap="xs">
            <Input label={t.awsRegion} placeholder={t.awsRegionPlaceholder} value={read(draftAwsRegion)} onChange={(value) => set(draftAwsRegion, value)} />
            <Input label={t.awsProfile} placeholder={t.awsProfilePlaceholder} value={read(draftAwsProfile)} onChange={(value) => set(draftAwsProfile, value)} />
          </Row>
          <Text muted size="xs">
            {t.awsHelp}
          </Text>
        </Stack>
      )}
      <Checkbox
        label={t.dangerousEnvironment}
        description={t.dangerousEnvironmentHelp}
        checked={dangerous}
        onChange={(checked) => set(draftDangerous, checked)}
      />
      <Checkbox
        label={t.exposeToAgents}
        description={t.exposeToAgentsHelp}
        checked={read(draftAgent)}
        onChange={(checked) => set(draftAgent, checked)}
      />
      <Checkbox
        label={t.alwaysAllowWrites}
        description={dangerous ? t.alwaysAllowWritesDangerous : t.alwaysAllowWritesHelp}
        checked={read(draftAgentWritesAlways)}
        disabled={!read(draftAgent) || dangerous}
        onChange={(checked) => set(draftAgentWritesAlways, checked)}
      />

      <Row gap="xs" wrap>
        <Button icon="check" onPress={() => void save()} disabled={working}>
          {t.save}
        </Button>
        <Button variant="outline" icon="play" onPress={() => void test()} disabled={working || selected === null}>
          {t.test}
        </Button>
        <Button variant="ghost" tone="danger" icon="delete" onPress={() => void remove()} disabled={working || selected === null}>
          {t.remove}
        </Button>
        <Button variant="ghost" icon="add" onPress={clearDraft} disabled={working || selected === null}>
          {t.new}
        </Button>
        {working ? <Spinner label={t.working} /> : null}
      </Row>
      {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}

      {current === null ? null : (
        <Stack gap="sm">
          <Row justify="between">
            <Heading level={3}>{t.query}</Heading>
            {current.dangerous ? (
              <Badge tone="danger">{current.environment || t.dangerous}</Badge>
            ) : current.environment ? (
              <Badge tone="accent">{current.environment}</Badge>
            ) : null}
          </Row>
          <Textarea
            label={t.sql}
            labelHidden
            placeholder={t.sqlPlaceholder}
            rows={4}
            value={read(sql)}
            onChange={(value) => {
              set(sql, value)
              set(pendingDangerousWrite, false)
            }}
            onSubmit={() => void runQuery()}
          />
          <Row gap="xs" wrap justify="between">
            <Row gap="xs">
              <Button icon="play" onPress={() => void runQuery()} disabled={working || read(sql).trim() === ''}>
                {t.run}
              </Button>
              <Button variant="outline" icon="search" onPress={() => void loadSchema()} disabled={working}>
                {t.schema}
              </Button>
            </Row>
            <Checkbox
              label={t.allowWrites}
              checked={read(allowWrites)}
              onChange={(checked) => {
                set(allowWrites, checked)
                set(pendingDangerousWrite, false)
              }}
            />
          </Row>
          {read(pendingDangerousWrite) ? (
            <Callout tone="danger" title={t.dangerousTitle(current.name)}>
              <Stack gap="xs">
                <Text>{t.dangerousBody}</Text>
                <Row gap="xs">
                  <Button tone="danger" icon="warning" onPress={() => void runQuery(true)} disabled={working}>
                    {t.runOn(current.environment || t.dangerousDefault)}
                  </Button>
                  <Button variant="ghost" onPress={() => set(pendingDangerousWrite, false)}>
                    {t.cancel}
                  </Button>
                </Row>
              </Stack>
            </Callout>
          ) : null}
          {failure ? <Callout tone="danger">{failure}</Callout> : null}
          <ResultView answer={read(result)} label={t.queryResult} />
          <SchemaTree />
        </Stack>
      )}

      <ActivityLog />

      <Text muted size="xs">
        {t.footer}
      </Text>
    </Stack>
  )
}
