// Reads a secret from AWS Secrets Manager: signed HTTPS when static credentials are at hand,
// otherwise through the installed AWS CLI (which covers SSO, assumed roles and everything else
// the person already set up). Values are cached in memory for a short while and never logged.
import { execFile } from 'node:child_process'
import { hostError } from '../errors.ts'
import { resolveAwsCredentials, type CredentialEnv } from './credentials.ts'
import { signRequest } from './sigv4.ts'

export type SecretRef = {
  secretId: string
  region?: string
  profile?: string
}

/** The fields an RDS-style database secret carries; any other JSON is kept as `raw`. */
export type DatabaseSecret = {
  password: string | null
  username: string | null
  host: string | null
  port: number | null
  database: string | null
  engine: string | null
  raw: Record<string, unknown> | string
}

export type SecretsManagerOptions = {
  env?: CredentialEnv
  home?: string
  fetch?: typeof fetch
  /** Overrides `https://secretsmanager.<region>.amazonaws.com` (tests). */
  endpoint?: string
  /** The AWS CLI executable; `null` disables the fallback. */
  cli?: string | null
  cliTimeoutMs?: number
  cacheTtlMs?: number
  now?(): number
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : typeof value === 'number' ? String(value) : null
}

export function parseDatabaseSecret(secretString: string): DatabaseSecret {
  let json: unknown
  try {
    json = JSON.parse(secretString)
  } catch {
    // A plain-text secret is the password itself.
    return { password: secretString, username: null, host: null, port: null, database: null, engine: null, raw: secretString }
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { password: secretString, username: null, host: null, port: null, database: null, engine: null, raw: secretString }
  }
  const record = json as Record<string, unknown>
  const port = record.port
  return {
    password: text(record.password),
    username: text(record.username) ?? text(record.user),
    host: text(record.host),
    port: typeof port === 'number' ? port : typeof port === 'string' && /^\d+$/.test(port) ? Number(port) : null,
    database: text(record.dbname) ?? text(record.database),
    engine: text(record.engine),
    raw: record
  }
}

function runCli(cli: string, args: string[], timeoutMs: number, env: CredentialEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cli, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024, env: env as NodeJS.ProcessEnv }, (error, stdout, stderr) => {
      if (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code === 'ENOENT') {
          reject(new Error(`the AWS CLI (${cli}) is not installed`))
          return
        }
        reject(new Error(`aws secretsmanager get-secret-value failed: ${String(stderr || error.message).trim()}`))
        return
      }
      resolve(stdout)
    })
  })
}

export class SecretsManager {
  private readonly options: SecretsManagerOptions
  private readonly cache = new Map<string, { value: DatabaseSecret; expiresAt: number }>()

  constructor(options: SecretsManagerOptions = {}) {
    this.options = options
  }

  private key(ref: SecretRef): string {
    return JSON.stringify([ref.secretId, ref.region ?? '', ref.profile ?? ''])
  }

  forget(ref?: SecretRef): void {
    if (ref === undefined) {
      this.cache.clear()
    } else {
      this.cache.delete(this.key(ref))
    }
  }

  async get(ref: SecretRef, { fresh = false }: { fresh?: boolean } = {}): Promise<DatabaseSecret> {
    if (ref.secretId.trim() === '') {
      throw hostError('invalid_params', 'the AWS secret name or ARN is empty')
    }
    const now = this.options.now?.() ?? Date.now()
    const cached = this.cache.get(this.key(ref))
    if (!fresh && cached !== undefined && cached.expiresAt > now) {
      return cached.value
    }
    const value = parseDatabaseSecret(await this.fetchSecretString(ref))
    this.cache.set(this.key(ref), { value, expiresAt: now + (this.options.cacheTtlMs ?? 5 * 60 * 1000) })
    return value
  }

  private async fetchSecretString(ref: SecretRef): Promise<string> {
    const env = this.options.env ?? process.env
    const resolved = await resolveAwsCredentials({ profile: ref.profile, region: ref.region, env, home: this.options.home })
    if (resolved.credentials !== null) {
      if (resolved.region === null) {
        throw hostError('invalid_params', 'no AWS region: set it on the connection, in AWS_REGION, or in the profile')
      }
      return this.fetchSigned(ref.secretId, resolved.region, resolved.credentials)
    }
    const cli = this.options.cli === undefined ? 'aws' : this.options.cli
    if (cli === null) {
      throw hostError('unavailable', `no AWS credentials: ${resolved.reason}`)
    }
    const args = ['secretsmanager', 'get-secret-value', '--secret-id', ref.secretId, '--output', 'json']
    if (resolved.region !== null) {
      args.push('--region', resolved.region)
    }
    if (ref.profile?.trim()) {
      args.push('--profile', ref.profile.trim())
    }
    let stdout: string
    try {
      stdout = await runCli(cli, args, this.options.cliTimeoutMs ?? 60_000, env)
    } catch (error) {
      throw hostError('unavailable', `${error instanceof Error ? error.message : String(error)} (${resolved.reason})`)
    }
    return this.secretStringOf(JSON.parse(stdout))
  }

  private async fetchSigned(secretId: string, region: string, credentials: NonNullable<Awaited<ReturnType<typeof resolveAwsCredentials>>['credentials']>): Promise<string> {
    const endpoint = this.options.endpoint ?? `https://secretsmanager.${region}.amazonaws.com`
    const url = new URL('/', endpoint)
    const body = JSON.stringify({ SecretId: secretId })
    const headers = signRequest({
      method: 'POST',
      url,
      headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'secretsmanager.GetSecretValue' },
      body,
      service: 'secretsmanager',
      region,
      credentials
    })
    const response = await (this.options.fetch ?? fetch)(url, { method: 'POST', headers, body })
    const answer = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      const type = String(answer.__type ?? response.status).split('#').pop()
      throw hostError('unavailable', `AWS Secrets Manager ${type}: ${String(answer.Message ?? answer.message ?? 'request failed')}`)
    }
    return this.secretStringOf(answer)
  }

  private secretStringOf(answer: Record<string, unknown>): string {
    if (typeof answer.SecretString === 'string') {
      return answer.SecretString
    }
    if (typeof answer.SecretBinary === 'string') {
      return Buffer.from(answer.SecretBinary, 'base64').toString('utf8')
    }
    throw hostError('unavailable', 'the secret has no SecretString or SecretBinary')
  }
}
