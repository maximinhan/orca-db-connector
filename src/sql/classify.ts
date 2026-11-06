// A first gate on SQL agents send: is it a read? The database session is also opened read-only
// (see src/drivers), so this classification only needs to be conservative, never exact.

export type SqlKind = 'read' | 'write' | 'empty'

export type SqlClassification = {
  kind: SqlKind
  /** The first keyword, lowercased, or null for empty text. */
  keyword: string | null
  /** Statements separated by top-level semicolons. */
  statements: number
}

const READ_KEYWORDS = new Set(['select', 'with', 'show', 'explain', 'describe', 'desc', 'pragma', 'values', 'table'])

// Words that make a statement a write wherever they appear outside strings and comments.
const WRITE_WORDS =
  /\b(insert|update|delete|merge|upsert|replace|create|alter|drop|truncate|rename|grant|revoke|attach|detach|vacuum|reindex|lock|call|exec|execute|copy|load|import|into|set|begin|start|commit|rollback|savepoint|release|analyze|optimize|flush|reset|kill|do)\b/i

/**
 * Removes string literals, quoted identifiers and comments, keeping everything else, so keyword
 * checks never match text inside a value such as 'drop me'.
 */
export function stripLiteralsAndComments(sql: string): string {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]
    if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i)
      i = end === -1 ? sql.length : end
      continue
    }
    if (ch === '#' && (i === 0 || /\s/.test(sql[i - 1] ?? ''))) {
      // MySQL line comment
      const end = sql.indexOf('\n', i)
      i = end === -1 ? sql.length : end
      continue
    }
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      out += ' '
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === '\\' && ch !== '`') {
          j += 2
          continue
        }
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2
            continue
          }
          break
        }
        j += 1
      }
      i = j + 1
      out += ch === "'" ? "''" : '""'
      continue
    }
    if (ch === '$') {
      // PostgreSQL dollar quoting: $$...$$ or $tag$...$tag$
      const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))
      if (match) {
        const close = sql.indexOf(match[0], i + match[0].length)
        i = close === -1 ? sql.length : close + match[0].length
        out += "''"
        continue
      }
    }
    out += ch
    i += 1
  }
  return out
}

export function classifySql(sql: string): SqlClassification {
  const bare = stripLiteralsAndComments(sql).trim()
  if (bare === '') {
    return { kind: 'empty', keyword: null, statements: 0 }
  }
  const statements = bare
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const keyword = /^[A-Za-z]+/.exec(bare)?.[0]?.toLowerCase() ?? null
  if (keyword === null || !READ_KEYWORDS.has(keyword)) {
    return { kind: 'write', keyword, statements: statements.length }
  }
  for (const statement of statements) {
    const first = /^[A-Za-z]+/.exec(statement)?.[0]?.toLowerCase() ?? ''
    if (!READ_KEYWORDS.has(first)) {
      return { kind: 'write', keyword, statements: statements.length }
    }
    // `PRAGMA x = y` writes; `PRAGMA x` reads.
    if (first === 'pragma' && statement.includes('=')) {
      return { kind: 'write', keyword, statements: statements.length }
    }
    // `WITH ... INSERT`, `SELECT ... INTO`, `EXPLAIN ANALYZE DELETE`, and so on.
    if (WRITE_WORDS.test(statement)) {
      return { kind: 'write', keyword, statements: statements.length }
    }
  }
  return { kind: 'read', keyword, statements: statements.length }
}
