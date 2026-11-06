// Turns driver values into the JSON cells the panel, the gateway and agents receive.
import type { DbCell, QueryResult } from '../protocol.ts'

export function toCell(value: unknown): DbCell {
  if (value === null || value === undefined) {
    return null
  }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      return Number.isFinite(value) ? value : String(value)
    case 'bigint':
      return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(value)
        : value.toString()
    case 'object': {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString()
      }
      if (value instanceof Uint8Array) {
        return `0x${Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('hex')}`
      }
      if (value instanceof ArrayBuffer) {
        return `0x${Buffer.from(value).toString('hex')}`
      }
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    default:
      return String(value)
  }
}

/** Column names made unique, as `a`, `a_2`, `a_3`, so duplicate names keep every value. */
export function uniqueColumns(names: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((raw) => {
    const name = raw === '' ? 'column' : raw
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    return count === 1 ? name : `${name}_${count}`
  })
}

/** Builds a result from array rows, keeping at most `maxRows`. */
export function resultFromArrays(
  columnNames: readonly string[],
  arrays: Iterable<readonly unknown[]>,
  maxRows: number,
  durationMs: number
): QueryResult {
  const columns = uniqueColumns(columnNames)
  const rows: Record<string, DbCell>[] = []
  let truncated = false
  for (const array of arrays) {
    if (rows.length >= maxRows) {
      truncated = true
      break
    }
    const row: Record<string, DbCell> = {}
    columns.forEach((column, index) => {
      row[column] = toCell(array[index])
    })
    rows.push(row)
  }
  return { columns, rows, rowCount: rows.length, truncated, durationMs }
}

/** Builds a result from object rows (one object per row), keeping at most `maxRows`. */
export function resultFromObjects(
  columnNames: readonly string[],
  objects: Iterable<Record<string, unknown>>,
  maxRows: number,
  durationMs: number
): QueryResult {
  const arrays = (function* () {
    for (const object of objects) {
      yield columnNames.map((column) => object[column])
    }
  })()
  return resultFromArrays(columnNames, arrays, maxRows, durationMs)
}

export function changesResult(changes: number, message: string, durationMs: number): QueryResult {
  return { columns: [], rows: [], rowCount: changes, truncated: false, durationMs, message }
}
