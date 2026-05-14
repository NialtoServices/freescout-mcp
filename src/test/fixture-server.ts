import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

/** Snapshot of an inbound HTTP request captured by the fixture server. */
export interface FixtureRequest {
  /** HTTP method (uppercase, e.g. `'GET'`). */
  method: string

  /** Request target — pathname plus search, exactly as sent by the client. */
  path: string

  /** Inbound request headers as Node delivers them. Header names are lowercase. */
  headers: NodeJS.Dict<string | string[]>

  /** Raw request body decoded as UTF-8 (empty string when there is no body). */
  body: string
}

/** Response the fixture server should send for the next request it receives. */
export interface FixtureResponse {
  /** HTTP status code. Defaults to `200`. */
  status?: number

  /**
   * Outbound response headers. When `body` is an object and `Content-Type` is not supplied,
   * `application/json` is added automatically.
   */
  headers?: Record<string, string>

  /**
   * Response body. Strings are sent verbatim; objects are serialised with `JSON.stringify`
   * and trigger the JSON `Content-Type` default. Omit for an empty body (e.g. `204 No Content`).
   */
  body?: string | object
}

/** Handle to a running fixture server. */
export interface FixtureServer {
  /** Base URL the client should be configured with, e.g. `http://127.0.0.1:54321`. */
  url: string

  /** Returns the most recent request the server received, or `undefined` when none has arrived. */
  lastRequest(): FixtureRequest | undefined

  /**
   * Queues a response for the next incoming request. The response is consumed once received, so
   * tests that issue several requests must call `respondWith` once per request.
   */
  respondWith(response: FixtureResponse): void

  /** Shuts the server down. Safe to call multiple times. */
  stop(): Promise<void>
}

/**
 * Starts an in-process HTTP server on a free localhost port for use in behaviour tests against the
 * FreeScout client. Tests configure the next response with `respondWith`, drive the client, and
 * then assert on `lastRequest()` and the value the client returned. No `fetch` mocking is involved.
 *
 * @returns A handle to the running server, including the base URL to configure the client with.
 */
export async function startFixtureServer(): Promise<FixtureServer> {
  let pendingResponse: FixtureResponse | undefined
  let lastRequest: FixtureRequest | undefined

  const server: Server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      lastRequest = {
        method: (request.method ?? 'GET').toUpperCase(),
        path: request.url ?? '/',
        headers: request.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }

      // If a test forgot to queue a response we fail loudly rather than silently returning 200.
      if (!pendingResponse) {
        response.statusCode = 500
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end('fixture-server: no response queued')
        return
      }

      const { status = 200, headers = {}, body } = pendingResponse
      pendingResponse = undefined

      response.statusCode = status

      const serialisedBody =
        typeof body === 'object' && body !== null
          ? (() => {
              if (!('Content-Type' in headers) && !('content-type' in headers)) {
                response.setHeader('Content-Type', 'application/json')
              }
              return JSON.stringify(body)
            })()
          : body

      for (const [name, value] of Object.entries(headers)) {
        response.setHeader(name, value)
      }

      if (serialisedBody === undefined) {
        response.end()
      } else {
        response.end(serialisedBody)
      }
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('fixture-server: expected an AddressInfo from server.address() after listen')
  }
  const url = `http://127.0.0.1:${address.port}`

  return {
    url,
    lastRequest: () => lastRequest,
    respondWith: (response) => {
      pendingResponse = response
    },
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
  }
}
