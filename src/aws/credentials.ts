// Finds AWS credentials the way the SDK's default chain starts: environment variables, then the
// shared credentials and config files (with `credential_process`). Anything else (SSO, assumed
// roles, instance metadata) is left to the AWS CLI fallback in secrets-manager.ts.
import { exec } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { AwsCredentials } from './sigv4.ts'

export type AwsProfile = Record<string, string>

export type ResolvedAws = {
  credentials: AwsCredentials | null
  region: string | null
  /** Why `credentials` is null, for the error message. */
  reason: string | null
}

export type CredentialEnv = Record<string, string | undefined>

/** Parses an AWS ini file: `[section]` headers, `key = value` lines, `#`/`;` comments. */
export function parseAwsIni(text: string): Record<string, AwsProfile> {
  const sections: Record<string, AwsProfile> = {}
  let current: AwsProfile | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#') || line.startsWith(';')) {
      continue
    }
    const header = /^\[\s*(.+?)\s*\]$/.exec(line)
    if (header) {
      current = sections[header[1]!] ??= {}
      continue
    }
    const pair = /^([^=]+?)\s*=\s*(.*)$/.exec(line)
    if (pair && current !== null && !raw.startsWith(' ') && !raw.startsWith('\t')) {
      current[pair[1]!.trim().toLowerCase()] = pair[2]!.trim()
    }
  }
  return sections
}

async function readIni(file: string): Promise<Record<string, AwsProfile>> {
  try {
    return parseAwsIni(await readFile(file, 'utf8'))
  } catch {
    return {}
  }
}

function runCredentialProcess(command: string, timeoutMs: number): Promise<AwsCredentials> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: timeoutMs, windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(new Error(`credential_process failed: ${error.message}`))
        return
      }
      try {
        const json = JSON.parse(stdout) as { AccessKeyId?: string; SecretAccessKey?: string; SessionToken?: string }
        if (!json.AccessKeyId || !json.SecretAccessKey) {
          throw new Error('missing AccessKeyId or SecretAccessKey')
        }
        resolve({ accessKeyId: json.AccessKeyId, secretAccessKey: json.SecretAccessKey, sessionToken: json.SessionToken })
      } catch (cause) {
        reject(new Error(`credential_process returned unusable output: ${cause instanceof Error ? cause.message : String(cause)}`))
      }
    })
  })
}

export type ResolveOptions = {
  profile?: string
  region?: string
  env?: CredentialEnv
  home?: string
  processTimeoutMs?: number
}

export async function resolveAwsCredentials(options: ResolveOptions = {}): Promise<ResolvedAws> {
  const env = options.env ?? process.env
  const home = options.home ?? homedir()
  const explicitProfile = options.profile?.trim() || undefined
  const profileName = explicitProfile ?? env.AWS_PROFILE?.trim() ?? 'default'

  const credentialsFile = env.AWS_SHARED_CREDENTIALS_FILE || path.join(home, '.aws', 'credentials')
  const configFile = env.AWS_CONFIG_FILE || path.join(home, '.aws', 'config')
  const [credentialsIni, configIni] = await Promise.all([readIni(credentialsFile), readIni(configFile)])
  const fromCredentials = credentialsIni[profileName] ?? {}
  const fromConfig = configIni[profileName === 'default' ? 'default' : `profile ${profileName}`] ?? {}
  const profile: AwsProfile = { ...fromConfig, ...fromCredentials }

  const region = options.region?.trim() || env.AWS_REGION || env.AWS_DEFAULT_REGION || profile.region || null

  // Environment variables win unless a profile was named explicitly, as in the SDK.
  if (explicitProfile === undefined && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    return {
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN || undefined
      },
      region,
      reason: null
    }
  }
  if (profile.aws_access_key_id && profile.aws_secret_access_key) {
    return {
      credentials: {
        accessKeyId: profile.aws_access_key_id,
        secretAccessKey: profile.aws_secret_access_key,
        sessionToken: profile.aws_session_token || undefined
      },
      region,
      reason: null
    }
  }
  if (profile.credential_process) {
    return { credentials: await runCredentialProcess(profile.credential_process, options.processTimeoutMs ?? 30_000), region, reason: null }
  }
  const kind = profile.sso_start_url || profile.sso_session ? 'an SSO profile' : profile.role_arn ? 'an assume-role profile' : 'no static keys'
  return {
    credentials: null,
    region,
    reason: `profile "${profileName}" has ${kind}; set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, add keys or a credential_process to ${credentialsFile}, or install the AWS CLI`
  }
}
