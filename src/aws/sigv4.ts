// AWS Signature Version 4 for one HTTPS request, with node:crypto only. Enough for the JSON
// APIs this plugin calls (Secrets Manager); no SDK is bundled because the catalog caps files at 1 MiB.
import { createHash, createHmac } from 'node:crypto'

export type AwsCredentials = {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

export type SignInput = {
  method: string
  url: URL
  headers: Record<string, string>
  body: string
  service: string
  region: string
  credentials: AwsCredentials
  /** ISO basic time such as `20150830T123600Z`; now when omitted. */
  date?: string
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function hmac(key: Buffer | string, text: string): Buffer {
  return createHmac('sha256', key).update(text, 'utf8').digest()
}

function amzDate(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function canonicalQuery(url: URL): string {
  const pairs: [string, string][] = []
  for (const [key, value] of url.searchParams) {
    pairs.push([encodeRfc3986(key), encodeRfc3986(value)])
  }
  pairs.sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1))
  return pairs.map(([key, value]) => `${key}=${value}`).join('&')
}

function canonicalPath(url: URL): string {
  const path = url.pathname === '' ? '/' : url.pathname
  return path
    .split('/')
    .map((segment) => encodeRfc3986(decodeURIComponent(segment)))
    .join('/')
}

/** Returns the headers to send: the input's plus host, x-amz-date, (x-amz-security-token) and authorization. */
export function signRequest(input: SignInput): Record<string, string> {
  const date = input.date ?? amzDate()
  const day = date.slice(0, 8)
  const headers: Record<string, string> = {}
  for (const [name, value] of Object.entries(input.headers)) {
    headers[name.toLowerCase()] = value.trim().replace(/\s+/g, ' ')
  }
  headers.host = input.url.host
  headers['x-amz-date'] = date
  if (input.credentials.sessionToken) {
    headers['x-amz-security-token'] = input.credentials.sessionToken
  }
  const signedNames = Object.keys(headers).sort()
  const canonicalHeaders = signedNames.map((name) => `${name}:${headers[name]}\n`).join('')
  const signedHeaders = signedNames.join(';')
  const payloadHash = sha256(input.body)
  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalPath(input.url),
    canonicalQuery(input.url),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')
  const scope = `${day}/${input.region}/${input.service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', date, scope, sha256(canonicalRequest)].join('\n')
  const kDate = hmac(`AWS4${input.credentials.secretAccessKey}`, day)
  const kRegion = hmac(kDate, input.region)
  const kService = hmac(kRegion, input.service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = hmac(kSigning, stringToSign).toString('hex')
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  return headers
}
