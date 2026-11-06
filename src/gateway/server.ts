// A loopback-only HTTP server with a bearer token, generated fresh each time the worker starts.
// Agents get the URL and token through the agent.launch.before hook (src/agent/launch-hook.ts).
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { handleGatewayRequest, type GatewayDeps } from './api.ts'

export type Gateway = {
  url: string
  token: string
  close(): Promise<void>
}

const MAX_BODY_BYTES = 256 * 1024

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`request body over ${MAX_BODY_BYTES} bytes`))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function authorized(request: IncomingMessage, token: string): boolean {
  const header = request.headers.authorization ?? ''
  const given = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store'
  })
  response.end(text)
}

export function startGateway(deps: GatewayDeps, options: { token?: string; port?: number } = {}): Promise<Gateway> {
  const token = options.token ?? randomBytes(32).toString('base64url')
  const server: Server = createServer(async (request, response) => {
    try {
      if (!authorized(request, token)) {
        send(response, 401, { error: { code: 'unauthorized', message: 'missing or wrong bearer token' } })
        return
      }
      let body: unknown = null
      if (request.method === 'POST' || request.method === 'PUT') {
        const text = await readBody(request)
        if (text !== '') {
          try {
            body = JSON.parse(text)
          } catch {
            send(response, 400, { error: { code: 'invalid_params', message: 'body is not JSON' } })
            return
          }
        }
      }
      const answer = await handleGatewayRequest(
        { method: request.method ?? 'GET', path: request.url ?? '/', body },
        deps
      )
      send(response, answer.status, answer.body)
    } catch (error) {
      send(response, 500, {
        error: { code: 'action_failed', message: error instanceof Error ? error.message : String(error) }
      })
    }
  })
  server.requestTimeout = 10 * 60 * 1000
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({
        url: `http://127.0.0.1:${port}`,
        token,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections?.()
            server.close(() => done())
          })
      })
    })
  })
}
