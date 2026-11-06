// Stands in for iconv-lite inside the mysql2 bundle, which would otherwise carry every legacy
// encoding table. Node's Buffer covers utf8, latin1, ascii, ucs2 and binary; any other MySQL
// charset fails with a clear message instead of silently mis-decoding.
'use strict'

function nodeEncoding(encoding) {
  const name = String(encoding).toLowerCase().replace(/[-_]/g, '')
  if (name === 'utf8' || name === 'utf8mb4') return 'utf8'
  if (name === 'latin1' || name === 'iso88591' || name === 'cp1252' || name === 'win1252') return 'latin1'
  if (name === 'ascii' || name === 'usascii') return 'ascii'
  if (name === 'ucs2' || name === 'utf16le') return 'utf16le'
  if (name === 'binary') return 'latin1'
  return null
}

function unsupported(encoding) {
  return new Error(`charset "${encoding}" is not supported by the bundled MySQL driver; use utf8mb4, latin1, ascii or ucs2`)
}

exports.encodingExists = (encoding) => nodeEncoding(encoding) !== null

exports.decode = (buffer, encoding) => {
  const name = nodeEncoding(encoding)
  if (name === null) throw unsupported(encoding)
  return Buffer.from(buffer).toString(name)
}

exports.encode = (text, encoding) => {
  const name = nodeEncoding(encoding)
  if (name === null) throw unsupported(encoding)
  return Buffer.from(String(text), name)
}
