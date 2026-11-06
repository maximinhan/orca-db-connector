// Right-sidebar panel. No build step: Orca strips the types and compiles the JSX when it loads.
// Only `orca` and relative files may be imported here (no bare npm packages).
import {
  atom,
  Badge,
  Button,
  Callout,
  Checkbox,
  Collapsible,
  EmptyState,
  Heading,
  Input,
  KeyValue,
  List,
  ListItem,
  plugin,
  read,
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
  type DbConnection,
  type DbDriverKind,
  type GatewayStatus,
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
const ACCESS_LABELS = { off: 'off', 'read-only': 'read-only', 'read-write': 'read and write' }

/** What the worker last answered; filled by setup() and after each change. */
const connections = atom<DbConnection[]>([])
/** The connection being edited; `persist: 'plugin'` keeps it across panel runs. */
const selectedId = atom<string | null>('selectedId', null, { persist: 'plugin' })
const note = atom<Note | null>(null)
const busy = atom(false)
const gateway = atom<GatewayStatus | null>(null)

// Keyed memory atoms: a half-typed form survives a hot reload while developing.
const draftName = atom('draft.name', '')
const draftDriver = atom<DbDriverKind>('draft.driver', 'postgres')
const draftHost = atom('draft.host', 'localhost')
const draftPort = atom('draft.port', '5432')
const draftDatabase = atom('draft.database', '')
const draftUser = atom('draft.user', '')
const draftPassword = atom('draft.password', '')
const draftAgent = atom('draft.agent', true)

// Query console.
const sql = atom('sql', '')
const allowWrites = atom(false)
const result = atom<QueryResult | null>(null)
const queryError = atom<string | null>(null)
const schema = atom<SchemaTable[] | null>(null)

function describe(connection: DbConnection): string {
  if (connection.driver === 'sqlite') {
    return `sqlite:${connection.database || '(no file)'}`
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

async function refresh(): Promise<void> {
  const answer = await plugin.request('connections.list')
  set(connections, answer.connections)
}

async function refreshGateway(): Promise<void> {
  set(gateway, await plugin.request('gateway.status'))
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
  set(draftAgent, true)
  set(note, null)
  set(result, null)
  set(queryError, null)
  set(schema, null)
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
  set(draftAgent, connection.agent)
  set(note, null)
  set(result, null)
  set(queryError, null)
  set(schema, null)
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
  const port = Number(read(draftPort))
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    set(note, { tone: 'danger', text: 'Port must be a whole number between 0 and 65535.' })
    return
  }
  const connection: DbConnection = {
    id: read(selectedId) ?? newId(),
    name,
    driver: read(draftDriver),
    host: read(draftHost).trim(),
    port,
    database: read(draftDatabase).trim(),
    user: read(draftUser).trim(),
    agent: read(draftAgent)
  }
  const password = read(draftPassword)
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
    set(note, { tone: 'danger', text: errorText(error) })
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
    set(note, { tone: 'danger', text: errorText(error) })
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
    set(note, { tone: 'danger', text: errorText(error) })
  } finally {
    set(busy, false)
  }
}

async function runQuery(): Promise<void> {
  const id = read(selectedId)
  const text = read(sql).trim()
  if (id === null || text === '') {
    return
  }
  set(busy, true)
  set(queryError, null)
  try {
    const answer = await plugin.request('query.run', { id, sql: text, allowWrites: read(allowWrites) }, { timeoutMs: 120_000 })
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

/** Runs once before the first render; what it pushes to `subscriptions` ends with the panel. */
export function setup(ctx: PanelContext): void {
  ctx.subscriptions.push(
    plugin.on('connections.changed', () => {
      void refresh().catch((error) => set(note, { tone: 'danger', text: errorText(error) }))
    })
  )
  void refresh().catch((error) => set(note, { tone: 'danger', text: errorText(error) }))
  void refreshGateway().catch(() => set(gateway, null))
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
          Claude Code also gets the orca-db MCP tools. Change access in the plugin settings.
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

function ResultTable() {
  const answer = read(result)
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
        label="Query result"
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

export default function Panel() {
  const list = read(connections)
  const selected = read(selectedId)
  const message = read(note)
  const working = read(busy)
  const isSqlite = read(draftDriver) === 'sqlite'
  const failure = read(queryError)
  return (
    <Stack gap="md">
      <Row justify="between">
        <Heading>Connections</Heading>
        <Badge tone={list.length > 0 ? 'accent' : 'neutral'}>{list.length} saved</Badge>
      </Row>

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
              description={`${describe(connection)}${connection.agent ? '' : ' (hidden from agents)'}`}
              icon="database"
              current={connection.id === selected}
              onPress={() => select(connection)}
            />
          ))}
        </List>
      )}

      <Heading level={3}>{selected === null ? 'New connection' : 'Edit connection'}</Heading>
      <Input label="Name" value={read(draftName)} onChange={(value) => set(draftName, value)} />
      <Select label="Driver" value={read(draftDriver)} options={DRIVER_OPTIONS} onChange={changeDriver} />
      {isSqlite ? null : (
        <Row gap="xs">
          <Input label="Host" value={read(draftHost)} onChange={(value) => set(draftHost, value)} />
          <Input label="Port" value={read(draftPort)} onChange={(value) => set(draftPort, value)} />
        </Row>
      )}
      <Input
        label={isSqlite ? 'Database file' : 'Database'}
        placeholder={isSqlite ? '~/data/app.db' : ''}
        value={read(draftDatabase)}
        onChange={(value) => set(draftDatabase, value)}
      />
      {isSqlite ? null : <Input label="User" value={read(draftUser)} onChange={(value) => set(draftUser, value)} />}
      {isSqlite ? null : (
        <Input
          label="Password"
          type="password"
          value={read(draftPassword)}
          placeholder={selected === null ? '' : 'Leave empty to keep the stored password'}
          onChange={(value) => set(draftPassword, value)}
        />
      )}
      <Checkbox
        label="Expose to agents"
        description="Agents launched from Orca may list, describe and query this connection."
        checked={read(draftAgent)}
        onChange={(checked) => set(draftAgent, checked)}
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

      {selected === null ? null : (
        <Stack gap="sm">
          <Heading level={3}>Query</Heading>
          <Textarea
            label="SQL"
            labelHidden
            placeholder="SELECT * FROM … (Cmd/Ctrl+Enter runs it)"
            rows={4}
            value={read(sql)}
            onChange={(value) => set(sql, value)}
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
            <Checkbox label="Allow writes" checked={read(allowWrites)} onChange={(checked) => set(allowWrites, checked)} />
          </Row>
          {failure ? <Callout tone="danger">{failure}</Callout> : null}
          <ResultTable />
          <SchemaTree />
        </Stack>
      )}

      <Text muted size="xs">
        Passwords are kept in Orca's encrypted secrets store and never leave this machine.
      </Text>
    </Stack>
  )
}
