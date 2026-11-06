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
  Stack,
  Table,
  Text,
  Textarea,
  Tree,
  type PanelContext
} from 'orca'
import {
  DB_DRIVER_KINDS,
  type ApprovalRequest,
  type DbConnection,
  type DbCredentials,
  type DbDriverKind,
  type GatewayStatus,
  type QueryLogEntry,
  type QueryResult,
  type SchemaTable
} from './protocol'

type Note = { tone: 'neutral' | 'success' | 'danger'; text: string }

const DRIVER_OPTIONS = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL / MariaDB' },
  { value: 'sqlite', label: 'SQLite (file)' }
]
const DEFAULT_PORTS: Record<DbDriverKind, number> = { postgres: 5432, mysql: 3306, sqlite: 0 }
const CREDENTIAL_OPTIONS = [
  { value: 'password', label: "Password (stored in Orca's secrets)" },
  { value: 'aws-secrets-manager', label: 'AWS Secrets Manager' }
]
const ACCESS_LABELS = { off: 'off', 'read-only': 'read-only', 'read-write': 'read and write' }

/** What the worker last answered; filled by setup() and after each change. */
const connections = atom<DbConnection[]>([])
/** The connection being edited; `persist: 'plugin'` keeps it across panel runs. */
const selectedId = atom<string | null>('selectedId', null, { persist: 'plugin' })
const note = atom<Note | null>(null)
const busy = atom(false)
const gateway = atom<GatewayStatus | null>(null)
const approvals = atom<ApprovalRequest[]>([])

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
  const name = read(draftName).trim()
  if (name === '') {
    set(note, { tone: 'danger', text: 'Give the connection a name first.' })
    return
  }
  const aws = read(draftDriver) !== 'sqlite' && read(draftCredentialSource) === 'aws-secrets-manager'
  const port = aws ? 0 : Number(read(draftPort))
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    set(note, { tone: 'danger', text: 'Port must be a whole number between 0 and 65535.' })
    return
  }
  if (aws && read(draftAwsSecretId).trim() === '') {
    set(note, { tone: 'danger', text: 'Give the AWS secret name or ARN.' })
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
    set(note, { tone: 'success', text: `Saved ${connection.name}.` })
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
  set(note, { tone: 'neutral', text: 'Connecting…' })
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
    set(note, { tone: 'neutral', text: 'Connection removed.' })
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
  void refresh().catch(fail)
  void refreshGateway().catch(() => set(gateway, null))
  void refreshApprovals().catch(() => set(approvals, []))
  void refreshLog().catch(() => set(logEntries, []))
}

function Approvals() {
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
          title={`${request.agent ?? 'An agent'} wants to write to ${request.connectionName}${request.environment ? ` (${request.environment})` : ''}`}
        >
          <Stack gap="xs">
            {request.dangerous ? <Text tone="danger" weight="semibold">Dangerous environment</Text> : null}
            <CodeView code={request.sql} language="sql" label="Statement" maxHeight="sm" />
            <Row gap="xs" justify="between">
              <Text muted size="xs">
                Asked <RelativeTime at={request.createdAt} />, expires <RelativeTime at={request.expiresAt} />
              </Text>
              <Row gap="xs">
                <Button tone="danger" icon="close" onPress={() => void decide(request.id, false)}>
                  Refuse
                </Button>
                <Button tone={request.dangerous ? 'danger' : 'accent'} icon="check" onPress={() => void decide(request.id, true)}>
                  Approve
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
  const status = read(gateway)
  if (status === null) {
    return null
  }
  if (!status.running) {
    return (
      <Callout tone="warning" title="Agent gateway is not running">
        {status.error ?? 'The worker could not start the local gateway. See orca plugin logs.'}
      </Callout>
    )
  }
  return (
    <Collapsible title="Agent access" description={`Gateway ${status.url}, ${ACCESS_LABELS[status.agentAccess]}`}>
      <Stack gap="sm">
        <KeyValue
          label="Agent gateway"
          items={[
            { label: 'Gateway', value: status.url ?? '', code: true },
            { label: 'Access', value: ACCESS_LABELS[status.agentAccess] },
            { label: 'MCP server', value: status.mcpServerPath, code: true }
          ]}
        />
        <Text muted size="xs">
          Agents launched from Orca get ORCA_DB_GATEWAY_URL, ORCA_DB_GATEWAY_TOKEN and ORCA_DB_MCP_SERVER;
          Claude Code also gets the orca-db MCP tools. Agent writes wait for your approval here unless the
          connection allows them at once. Change access in the plugin settings.
        </Text>
      </Stack>
    </Collapsible>
  )
}

function SchemaTree() {
  const tables = read(schema)
  if (tables === null) {
    return null
  }
  if (tables.length === 0) {
    return <Text muted>No tables or views.</Text>
  }
  return (
    <Tree
      label="Tables and views"
      items={tables.map((table) => ({
        key: `${table.schema ?? ''}.${table.name}`,
        label: table.schema ? `${table.schema}.${table.name}` : table.name,
        description: `${table.kind}, ${table.columns.length} columns`,
        icon: table.kind === 'view' ? 'file' : 'database',
        children: table.columns.map((column) => ({
          key: `${table.schema ?? ''}.${table.name}.${column.name}`,
          label: column.name,
          description: `${column.type}${column.primaryKey ? ', primary key' : ''}${column.nullable ? '' : ', not null'}`
        }))
      }))}
    />
  )
}

function ResultView({ answer, label }: { answer: QueryResult | null; label: string }) {
  if (answer === null) {
    return null
  }
  if (answer.columns.length === 0) {
    return (
      <Text tone="success">
        {answer.message ?? `${answer.rowCount} row(s) changed`} ({answer.durationMs} ms)
      </Text>
    )
  }
  return (
    <Stack gap="xs">
      <Table
        label={label}
        columns={answer.columns.map((column) => ({ key: column, label: column, minWidth: 'xs' }))}
        rows={answer.rows.map((row, index) => ({ key: String(index), cells: row }))}
        emptyText="No rows"
      />
      <Text muted size="xs">
        {answer.rowCount} row(s){answer.truncated ? ', truncated at the Max rows setting' : ''} in {answer.durationMs} ms
      </Text>
    </Stack>
  )
}

function statusTone(entry: QueryLogEntry): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (entry.status !== 'ok') {
    return 'danger'
  }
  if (entry.dangerous) {
    return 'danger'
  }
  return entry.kind === 'write' ? 'warning' : 'neutral'
}

function ActivityLog() {
  const entries = read(logEntries)
  const selected = read(logSelectedId)
  const current = entries.find((entry) => entry.id === selected) ?? null
  return (
    <Collapsible title="Activity" description={`${entries.length} queries logged`}>
      <Stack gap="sm">
        {entries.length === 0 ? (
          <Text muted>Queries from this panel and from agents appear here with their rows.</Text>
        ) : (
          <List label="Queries">
            {entries.slice(0, 50).map((entry) => (
              <ListItem
                key={entry.id}
                title={entry.sql.length > 80 ? `${entry.sql.slice(0, 80)}…` : entry.sql}
                description={`${entry.source === 'agent' ? (entry.agent ?? 'agent') : 'panel'} · ${entry.connectionName}${entry.environment ? ` (${entry.environment})` : ''} · ${entry.status === 'ok' ? `${entry.rowCount} rows` : entry.status} · ${entry.durationMs} ms`}
                icon={entry.dangerous ? 'warning' : entry.kind === 'write' ? 'edit' : 'search'}
                current={entry.id === selected}
                onPress={() => void showLogEntry(entry)}
              >
                <Row gap="xs" wrap>
                  {entry.dangerous ? <Badge tone="danger">DANGEROUS</Badge> : null}
                  <Badge tone={statusTone(entry)}>{entry.kind}</Badge>
                  {entry.status !== 'ok' ? <Badge tone="danger">{entry.status}</Badge> : null}
                  {entry.approval === 'approved' ? <Badge tone="accent">approved</Badge> : null}
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
            <CodeView code={current.sql} language="sql" label="SQL" maxHeight="sm" />
            {current.error ? <Callout tone="danger">{current.error}</Callout> : null}
            {current.status === 'ok' && !current.hasResult ? <Text muted size="xs">Rows are no longer held by the worker.</Text> : null}
            <ResultView answer={read(logResult)} label="Logged result" />
          </Stack>
        ) : null}
        <Row justify="end">
          <Button variant="ghost" icon="delete" onPress={() => void clearLog()} disabled={entries.length === 0}>
            Clear log
          </Button>
        </Row>
      </Stack>
    </Collapsible>
  )
}

export default function Panel() {
  const list = read(connections)
  const selected = read(selectedId)
  const current = selectedConnection()
  const message = read(note)
  const working = read(busy)
  const isSqlite = read(draftDriver) === 'sqlite'
  const failure = read(queryError)
  const dangerous = read(draftDangerous)
  const awsCredentials = read(draftCredentialSource) === 'aws-secrets-manager'
  return (
    <Stack gap="md">
      <Row justify="between">
        <Heading>Connections</Heading>
        <Badge tone={list.length > 0 ? 'accent' : 'neutral'}>{list.length} saved</Badge>
      </Row>

      <Approvals />
      <GatewaySection />

      {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}

      {list.length === 0 ? (
        <EmptyState
          title="No connections yet"
          description="Fill in the form below and press Save."
          icon="database"
        />
      ) : (
        <List label="Saved connections">
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
                {connection.dangerous ? <Badge tone="danger">dangerous</Badge> : null}
                {connection.agent ? (
                  <Badge tone={connection.agentWrites === 'always' ? 'warning' : 'neutral'}>
                    {connection.agentWrites === 'always' ? 'agents: write' : 'agents: ask'}
                  </Badge>
                ) : (
                  <Badge tone="neutral">hidden from agents</Badge>
                )}
              </Row>
            </ListItem>
          ))}
        </List>
      )}

      <Row justify="between">
        <Heading level={3}>{selected === null ? 'New connection' : 'Edit connection'}</Heading>
        {current?.dangerous ? <Badge tone="danger">DANGEROUS</Badge> : null}
      </Row>
      <Input label="Name" value={read(draftName)} onChange={(value) => set(draftName, value)} />
      <Input
        label="Environment label"
        placeholder="local, dev, staging, prod…"
        maxLength={32}
        value={read(draftEnvironment)}
        onChange={(value) => set(draftEnvironment, value)}
      />
      <Select label="Driver" value={read(draftDriver)} options={DRIVER_OPTIONS} onChange={changeDriver} />
      {isSqlite ? null : (
        <Select
          label="Credentials"
          value={read(draftCredentialSource)}
          options={CREDENTIAL_OPTIONS}
          onChange={(value) => set(draftCredentialSource, value === 'aws-secrets-manager' ? 'aws-secrets-manager' : 'password')}
        />
      )}
      {isSqlite || awsCredentials ? null : (
        <Row gap="xs">
          <Input label="Host" value={read(draftHost)} onChange={(value) => set(draftHost, value)} />
          <Input label="Port" value={read(draftPort)} onChange={(value) => set(draftPort, value)} />
        </Row>
      )}
      {!isSqlite && awsCredentials ? null : (
        <Input
          label={isSqlite ? 'Database file' : 'Database'}
          placeholder={isSqlite ? '~/data/app.db' : ''}
          value={read(draftDatabase)}
          onChange={(value) => set(draftDatabase, value)}
        />
      )}
      {isSqlite || awsCredentials ? null : <Input label="User" value={read(draftUser)} onChange={(value) => set(draftUser, value)} />}
      {isSqlite || awsCredentials ? null : (
        <Input
          label="Password"
          type="password"
          value={read(draftPassword)}
          placeholder={selected === null ? '' : 'Leave empty to keep the stored password'}
          onChange={(value) => set(draftPassword, value)}
        />
      )}
      {isSqlite || !awsCredentials ? null : (
        <Stack gap="xs">
          <Input
            label="AWS secret name or ARN"
            placeholder="prod/app/db or arn:aws:secretsmanager:…"
            value={read(draftAwsSecretId)}
            onChange={(value) => set(draftAwsSecretId, value)}
          />
          <Row gap="xs">
            <Input label="AWS region" placeholder="Empty: AWS_REGION or the profile" value={read(draftAwsRegion)} onChange={(value) => set(draftAwsRegion, value)} />
            <Input label="AWS profile" placeholder="Empty: AWS_PROFILE or default" value={read(draftAwsProfile)} onChange={(value) => set(draftAwsProfile, value)} />
          </Row>
          <Text muted size="xs">
            Host, port, user, database and password all come from the secret (the RDS format: host, port,
            username, dbname, password). AWS credentials come from AWS_ACCESS_KEY_ID, ~/.aws/credentials or
            credential_process, else from the installed AWS CLI (SSO and roles). The value is cached in the
            worker for 5 minutes and never shown.
          </Text>
        </Stack>
      )}
      <Checkbox
        label="Dangerous environment"
        description="Every write is confirmed by you, agent writes always ask, and its queries are highlighted."
        checked={dangerous}
        onChange={(checked) => set(draftDangerous, checked)}
      />
      <Checkbox
        label="Expose to agents"
        description="Agents launched from Orca may list, describe and query this connection."
        checked={read(draftAgent)}
        onChange={(checked) => set(draftAgent, checked)}
      />
      <Checkbox
        label="Always allow agent writes"
        description={
          dangerous
            ? 'Ignored on a dangerous environment: agent writes always wait for your approval.'
            : 'Off: each agent write waits for your approval here. On: agent writes run at once (Agent access must be "Read and write").'
        }
        checked={read(draftAgentWritesAlways)}
        disabled={!read(draftAgent) || dangerous}
        onChange={(checked) => set(draftAgentWritesAlways, checked)}
      />

      <Row gap="xs" wrap>
        <Button icon="check" onPress={() => void save()} disabled={working}>
          Save
        </Button>
        <Button variant="outline" icon="play" onPress={() => void test()} disabled={working || selected === null}>
          Test
        </Button>
        <Button variant="ghost" tone="danger" icon="delete" onPress={() => void remove()} disabled={working || selected === null}>
          Remove
        </Button>
        <Button variant="ghost" icon="add" onPress={clearDraft} disabled={working || selected === null}>
          New
        </Button>
      </Row>

      {current === null ? null : (
        <Stack gap="sm">
          <Row justify="between">
            <Heading level={3}>Query</Heading>
            {current.dangerous ? <Badge tone="danger">{current.environment || 'dangerous'}</Badge> : current.environment ? <Badge tone="accent">{current.environment}</Badge> : null}
          </Row>
          <Textarea
            label="SQL"
            labelHidden
            placeholder="SELECT * FROM … (Cmd/Ctrl+Enter runs it)"
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
                Run
              </Button>
              <Button variant="outline" icon="search" onPress={() => void loadSchema()} disabled={working}>
                Schema
              </Button>
            </Row>
            <Checkbox
              label="Allow writes"
              checked={read(allowWrites)}
              onChange={(checked) => {
                set(allowWrites, checked)
                set(pendingDangerousWrite, false)
              }}
            />
          </Row>
          {read(pendingDangerousWrite) ? (
            <Callout tone="danger" title={`${current.name} is a dangerous environment`}>
              <Stack gap="xs">
                <Text>Writes are allowed and this runs inside a transaction. Run it there anyway?</Text>
                <Row gap="xs">
                  <Button tone="danger" icon="warning" onPress={() => void runQuery(true)} disabled={working}>
                    Run on {current.environment || 'dangerous environment'}
                  </Button>
                  <Button variant="ghost" onPress={() => set(pendingDangerousWrite, false)}>
                    Cancel
                  </Button>
                </Row>
              </Stack>
            </Callout>
          ) : null}
          {failure ? <Callout tone="danger">{failure}</Callout> : null}
          <ResultView answer={read(result)} label="Query result" />
          <SchemaTree />
        </Stack>
      )}

      <ActivityLog />

      <Text muted size="xs">
        Passwords are kept in Orca's encrypted secrets store and never leave this machine.
      </Text>
    </Stack>
  )
}
