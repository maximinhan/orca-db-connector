import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { parseAwsIni, resolveAwsCredentials } from './credentials.ts'
import { parseDatabaseSecret, SecretsManager } from './secrets-manager.ts'

const home = mkdtempSync(path.join(tmpdir(), 'orca-db-aws-'))
mkdirSync(path.join(home, '.aws'))
writeFileSync(
  path.join(home, '.aws', 'credentials'),
  `[default]
aws_access_key_id = AKIADEFAULT
aws_secret_access_key = defaultsecret

[staging]
aws_access_key_id = AKIASTAGING
aws_secret_access_key = stagingsecret
aws_session_token = stagingtoken
`
)
writeFileSync(
  path.join(home, '.aws', 'config'),
  `[default]
region = us-east-1

[profile staging]
region = ap-northeast-2

[profile sso]
sso_start_url = https://example.awsapps.com/start
region = eu-west-1

[profile proc]
credential_process = node -e "console.log(JSON.stringify({Version:1,AccessKeyId:'AKIAPROC',SecretAccessKey:'procsecret'}))"
`
)

let server: Server
let endpoint = ''
const seen: { target: string; body: string; auth: string }[] = []
let secretString = JSON.stringify({ username: 'app', password: 'pw', engine: 'postgres', host: 'db.internal', port: 5432, dbname: 'app' })

before(async () => {
  server = createServer((request, response) => {
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => {
      seen.push({ target: String(request.headers['x-amz-target']), body, auth: String(request.headers.authorization) })
      if (body.includes('missing')) {
        response.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' })
        response.end(JSON.stringify({ __type: 'ResourceNotFoundException', Message: "Secrets Manager can't find the specified secret." }))
        return
      }
      response.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' })
      response.end(JSON.stringify({ ARN: 'arn:aws:secretsmanager:ap-northeast-2:1:secret:x', Name: 'x', SecretString: secretString }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  rmSync(home, { recursive: true, force: true })
})

test('parses ini files and resolves credentials from env, profiles and credential_process', async () => {
  const ini = parseAwsIni('# c\n[a]\nk = v\n[profile b]\nx=1\n')
  assert.deepEqual(ini, { a: { k: 'v' }, 'profile b': { x: '1' } })

  const fromEnv = await resolveAwsCredentials({ env: { AWS_ACCESS_KEY_ID: 'AKIAENV', AWS_SECRET_ACCESS_KEY: 'envsecret', AWS_REGION: 'us-west-2' }, home })
  assert.deepEqual(fromEnv, { credentials: { accessKeyId: 'AKIAENV', secretAccessKey: 'envsecret', sessionToken: undefined }, region: 'us-west-2', reason: null })

  const fromDefault = await resolveAwsCredentials({ env: {}, home })
  assert.equal(fromDefault.credentials?.accessKeyId, 'AKIADEFAULT')
  assert.equal(fromDefault.region, 'us-east-1')

  const fromProfile = await resolveAwsCredentials({ env: { AWS_ACCESS_KEY_ID: 'AKIAENV', AWS_SECRET_ACCESS_KEY: 'x' }, home, profile: 'staging' })
  assert.equal(fromProfile.credentials?.accessKeyId, 'AKIASTAGING', 'an explicit profile beats the environment')
  assert.equal(fromProfile.credentials?.sessionToken, 'stagingtoken')
  assert.equal(fromProfile.region, 'ap-northeast-2')

  const sso = await resolveAwsCredentials({ env: {}, home, profile: 'sso' })
  assert.equal(sso.credentials, null)
  assert.match(sso.reason ?? '', /SSO profile/)
  assert.equal(sso.region, 'eu-west-1')

  const proc = await resolveAwsCredentials({ env: {}, home, profile: 'proc' })
  assert.equal(proc.credentials?.accessKeyId, 'AKIAPROC')
})

test('parses RDS secrets and plain-text secrets', () => {
  const rds = parseDatabaseSecret(secretString)
  assert.deepEqual([rds.username, rds.password, rds.host, rds.port, rds.database, rds.engine], ['app', 'pw', 'db.internal', 5432, 'app', 'postgres'])
  assert.equal(parseDatabaseSecret('just-a-password').password, 'just-a-password')
  assert.equal(parseDatabaseSecret('{"password":"p","port":"3306"}').port, 3306)
  assert.equal(parseDatabaseSecret('{"user":"u"}').username, 'u')
})

test('fetches a secret with a signed request, caches it and reports AWS errors', async () => {
  let now = 1_000_000
  const manager = new SecretsManager({ env: {}, home, endpoint, cli: null, cacheTtlMs: 1000, now: () => now })
  const first = await manager.get({ secretId: 'prod/db', profile: 'staging' })
  assert.equal(first.password, 'pw')
  assert.equal(seen.length, 1)
  assert.equal(seen[0]?.target, 'secretsmanager.GetSecretValue')
  assert.equal(seen[0]?.body, '{"SecretId":"prod/db"}')
  assert.match(seen[0]?.auth ?? '', /Credential=AKIASTAGING\/\d{8}\/ap-northeast-2\/secretsmanager\/aws4_request/)

  secretString = JSON.stringify({ password: 'rotated' })
  assert.equal((await manager.get({ secretId: 'prod/db', profile: 'staging' })).password, 'pw', 'served from cache')
  now += 2000
  assert.equal((await manager.get({ secretId: 'prod/db', profile: 'staging' })).password, 'rotated', 'expired and refetched')
  assert.equal((await manager.get({ secretId: 'prod/db', profile: 'staging' }, { fresh: true })).password, 'rotated')
  assert.equal(seen.length, 3)

  await assert.rejects(manager.get({ secretId: 'missing', profile: 'staging' }), /ResourceNotFoundException/)
  await assert.rejects(manager.get({ secretId: 'x', profile: 'sso' }), /no AWS credentials.*SSO/)
  await assert.rejects(manager.get({ secretId: '' }), /empty/)
})

test('falls back to the AWS CLI when no static credentials exist', async () => {
  const bin = mkdtempSync(path.join(tmpdir(), 'orca-db-awscli-'))
  const cli = path.join(bin, 'fake-aws')
  writeFileSync(
    cli,
    `#!/bin/sh
echo "$@" > "${path.join(bin, 'args')}"
echo '{"Name":"x","SecretString":"{\\"password\\":\\"from-cli\\"}"}'
`
  )
  chmodSync(cli, 0o755)
  try {
    const manager = new SecretsManager({ env: {}, home, cli })
    const secret = await manager.get({ secretId: 'arn:aws:secretsmanager:eu-west-1:1:secret:x', profile: 'sso' })
    assert.equal(secret.password, 'from-cli')
    const args = (await import('node:fs/promises')).readFile(path.join(bin, 'args'), 'utf8')
    assert.match(await args, /secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:eu-west-1:1:secret:x --output json --region eu-west-1 --profile sso/)

    const missing = new SecretsManager({ env: {}, home, cli: path.join(bin, 'nope') })
    await assert.rejects(missing.get({ secretId: 'x', profile: 'sso' }), /not installed/)
  } finally {
    rmSync(bin, { recursive: true, force: true })
  }
})
