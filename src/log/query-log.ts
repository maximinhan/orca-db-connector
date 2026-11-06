// Every query the panel or an agent runs, with its outcome, and the rows of the most recent ones
// so the panel can show them. Entries persist in the plugin's storage (without rows); rows stay in
// the worker's memory until it restarts or the log is cleared.
import { randomBytes } from 'node:crypto'
import type { QueryLogEntry, QueryResult } from '../protocol.ts'

export const LOG_KEY = 'queryLog'
const MAX_ENTRIES = 200
const MAX_RESULTS = 50
const MAX_SQL_CHARS = 4000

export type QueryLogStore = {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
}

export type QueryLogOptions = {
  store?: QueryLogStore
  onChange?(entries: QueryLogEntry[]): void
}

export type QueryLogInput = Omit<QueryLogEntry, 'id' | 'at' | 'hasResult'>

function isEntry(value: unknown): value is QueryLogEntry {
  return typeof value === 'object' && value !== null && typeof (value as QueryLogEntry).id === 'string' && typeof (value as QueryLogEntry).sql === 'string'
}

export class QueryLog {
  private entries: QueryLogEntry[] = []
  private readonly results = new Map<string, QueryResult>()
  private readonly options: QueryLogOptions
  private saving: Promise<void> = Promise.resolve()

  constructor(options: QueryLogOptions = {}) {
    this.options = options
  }

  /** Loads persisted entries; rows are never persisted, so they start out absent. */
  async load(): Promise<void> {
    const stored = await this.options.store?.get(LOG_KEY)
    if (Array.isArray(stored)) {
      this.entries = stored.filter(isEntry).map((entry) => ({ ...entry, hasResult: false })).slice(0, MAX_ENTRIES)
    }
  }

  /** Newest first. */
  list(): QueryLogEntry[] {
    return [...this.entries]
  }

  result(id: string): QueryResult | null {
    return this.results.get(id) ?? null
  }

  append(input: QueryLogInput, result: QueryResult | null): QueryLogEntry {
    const entry: QueryLogEntry = {
      ...input,
      sql: input.sql.length > MAX_SQL_CHARS ? `${input.sql.slice(0, MAX_SQL_CHARS)}…` : input.sql,
      id: `q-${randomBytes(6).toString('hex')}`,
      at: Date.now(),
      hasResult: result !== null
    }
    this.entries.unshift(entry)
    if (this.entries.length > MAX_ENTRIES) {
      for (const dropped of this.entries.splice(MAX_ENTRIES)) {
        this.results.delete(dropped.id)
      }
    }
    if (result !== null) {
      this.results.set(entry.id, result)
      if (this.results.size > MAX_RESULTS) {
        const oldest = [...this.results.keys()][0]
        if (oldest !== undefined) {
          this.results.delete(oldest)
          const old = this.entries.find((candidate) => candidate.id === oldest)
          if (old !== undefined) {
            old.hasResult = false
          }
        }
      }
    }
    this.changed()
    return entry
  }

  clear(): number {
    const count = this.entries.length
    this.entries = []
    this.results.clear()
    this.changed()
    return count
  }

  /** Resolves once the latest state is written to storage. */
  flush(): Promise<void> {
    return this.saving
  }

  private changed(): void {
    this.options.onChange?.(this.list())
    const store = this.options.store
    if (store !== undefined) {
      const snapshot = this.entries.map((entry) => ({ ...entry, hasResult: false }))
      this.saving = this.saving.then(() => store.set(LOG_KEY, snapshot)).catch(() => undefined)
    }
  }
}
