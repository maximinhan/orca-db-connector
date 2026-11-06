// Stands in for iconv-lite inside the mysql2 bundle, which would otherwise carry every legacy
// encoding table. Decoding goes through Node's TextDecoder (full ICU in Node and Electron), which
// covers the MySQL charsets below; encoding (text the client sends) supports what Buffer can.
// mysql2 calls decode()/encode() for Buffer-native encodings itself and only reaches
// getDecoder()/getEncoder() for the others.
'use strict'

// mysql2 charset name -> WHATWG TextDecoder label. CESU-8 is read as UTF-8: it only differs for
// characters outside the BMP, which MySQL's utf8mb3 cannot store anyway.
const DECODER_LABELS = {
  utf8: 'utf-8',
  utf8mb4: 'utf-8',
  cesu8: 'utf-8',
  ascii: 'utf-8',
  latin1: 'windows-1252',
  cp1252: 'windows-1252',
  latin2: 'iso-8859-2',
  latin5: 'iso-8859-9',
  latin7: 'iso-8859-13',
  greek: 'iso-8859-7',
  hebrew: 'iso-8859-8',
  cp1250: 'windows-1250',
  cp1251: 'windows-1251',
  cp1256: 'windows-1256',
  cp1257: 'windows-1257',
  cp866: 'ibm866',
  koi8r: 'koi8-r',
  koi8u: 'koi8-u',
  tis620: 'windows-874',
  macintosh: 'macintosh',
  macroman: 'macintosh',
  euckr: 'euc-kr',
  eucjp: 'euc-jp',
  eucjpms: 'euc-jp',
  sjis: 'shift_jis',
  cp932: 'shift_jis',
  gbk: 'gbk',
  gb2312: 'gbk',
  gb18030: 'gb18030',
  big5: 'big5',
  ucs2: 'utf-16le',
  'utf16-le': 'utf-16le',
  utf16: 'utf-16be'
}

const BUFFER_ENCODERS = { utf8: 'utf8', utf8mb4: 'utf8', cesu8: 'utf8', ascii: 'ascii', latin1: 'latin1', binary: 'latin1', ucs2: 'utf16le', 'utf16-le': 'utf16le' }

function normalize(encoding) {
  return String(encoding).toLowerCase().replace(/[^a-z0-9-]/g, '')
}

function unsupported(encoding, what) {
  return new Error(`the bundled MySQL driver cannot ${what} the "${encoding}" charset; use utf8mb4 on the connection`)
}

function decoderFor(encoding) {
  const label = DECODER_LABELS[normalize(encoding)]
  if (label === undefined) {
    throw unsupported(encoding, 'decode')
  }
  try {
    return new TextDecoder(label)
  } catch {
    throw unsupported(encoding, 'decode')
  }
}

exports.encodingExists = (encoding) => normalize(encoding) in DECODER_LABELS || normalize(encoding) in BUFFER_ENCODERS

exports.getDecoder = (encoding) => {
  const decoder = decoderFor(encoding)
  return {
    write: (buffer) => decoder.decode(buffer, { stream: true }),
    end: () => decoder.decode()
  }
}

exports.decode = (buffer, encoding) => {
  const native = BUFFER_ENCODERS[normalize(encoding)]
  if (native !== undefined) {
    return Buffer.from(buffer).toString(native)
  }
  return decoderFor(encoding).decode(buffer)
}

exports.getEncoder = (encoding) => {
  const native = BUFFER_ENCODERS[normalize(encoding)]
  if (native === undefined) {
    throw unsupported(encoding, 'encode text for')
  }
  return {
    write: (text) => Buffer.from(String(text), native),
    end: () => Buffer.alloc(0)
  }
}

exports.encode = (text, encoding) => exports.getEncoder(encoding).write(text)
