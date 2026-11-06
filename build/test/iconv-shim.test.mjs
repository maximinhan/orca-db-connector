// The iconv-lite stand-in inside vendor/mysql2.cjs must offer what mysql2's string parser calls.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const shim = require('../shims/iconv-lite.cjs')

test('getDecoder streams and decodes the charsets MySQL names', () => {
  const decoder = shim.getDecoder('cesu8')
  assert.equal(decoder.write(Buffer.from('한글 ok')) + decoder.end(), '한글 ok')
  assert.equal(shim.decode(Buffer.from([0xbe, 0xc8, 0xb3, 0xe7]), 'euckr'), '안녕')
  assert.equal(shim.decode(Buffer.from([0x80]), 'cp1252'), '€')
  assert.equal(shim.decode(Buffer.from([0xc7, 0xb0]), 'sjis'), 'ﾇｰ')
  assert.equal(shim.encodingExists('gbk'), true)
  assert.throws(() => shim.getDecoder('swe7'), /cannot decode the "swe7" charset/)
})

test('getEncoder covers Buffer encodings and refuses the rest', () => {
  const encoder = shim.getEncoder('utf8')
  assert.equal(Buffer.concat([encoder.write('é'), encoder.end()]).toString('hex'), 'c3a9')
  assert.equal(shim.encode('A', 'latin1').toString('hex'), '41')
  assert.throws(() => shim.getEncoder('euckr'), /cannot encode text for the "euckr" charset/)
})
