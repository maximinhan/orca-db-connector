import assert from 'node:assert/strict'
import { test } from 'node:test'
import { signRequest } from './sigv4.ts'

// The worked example from the AWS "Signature Version 4 signing process" documentation
// (GET https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08 on 20150830T123600Z).
test('matches the AWS documentation example signature', () => {
  const headers = signRequest({
    method: 'GET',
    url: new URL('https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08'),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: '',
    service: 'iam',
    region: 'us-east-1',
    credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' },
    date: '20150830T123600Z'
  })
  assert.equal(
    headers.authorization,
    'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7'
  )
  assert.equal(headers.host, 'iam.amazonaws.com')
  assert.equal(headers['x-amz-date'], '20150830T123600Z')
})

test('adds the session token header and signs a JSON POST', () => {
  const headers = signRequest({
    method: 'POST',
    url: new URL('https://secretsmanager.ap-northeast-2.amazonaws.com/'),
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'secretsmanager.GetSecretValue' },
    body: '{"SecretId":"prod/db"}',
    service: 'secretsmanager',
    region: 'ap-northeast-2',
    credentials: { accessKeyId: 'AKID', secretAccessKey: 'secret', sessionToken: 'tok' }
  })
  assert.equal(headers['x-amz-security-token'], 'tok')
  assert.match(headers.authorization ?? '', /SignedHeaders=content-type;host;x-amz-date;x-amz-security-token;x-amz-target, Signature=[0-9a-f]{64}$/)
})
