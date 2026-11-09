import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentConnectText } from './connect-text.ts'

test('tells a running agent how to reach the gateway', () => {
  const text = agentConnectText({
    gatewayUrl: 'http://127.0.0.1:4321',
    token: 'tok',
    mcpServerPath: '/p/mcp/orca-db-mcp.mjs',
    agent: 'claude',
    access: 'read-write'
  })
  assert.match(text, /Authorization: Bearer tok/)
  assert.match(text, /x-orca-agent: claude/)
  assert.match(text, /http:\/\/127\.0\.0\.1:4321\/connections\/<id>\/query/)
  assert.match(text, /waits until I approve/)
  assert.doesNotMatch(text, /\n\n/)

  const readOnly = agentConnectText({ gatewayUrl: 'u', token: 't', mcpServerPath: 'm', agent: null, access: 'read-only' })
  assert.match(readOnly, /Only read statements/)
  assert.doesNotMatch(readOnly, /x-orca-agent/)
})
