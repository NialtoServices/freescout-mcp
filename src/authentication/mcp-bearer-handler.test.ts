import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '../lib/freescout'
import { startFixtureServer, type FixtureServer } from '../test/fixture-server'
import { UserResolver } from './freescout'
import { createBearerRequestHandler } from './mcp-bearer-handler'
import { createOAuthConfiguration, OAuthBearerTokenVerifier } from './oauth'

const ISSUER = 'https://issuer.example.com/'
const AUDIENCE = 'freescout-mcp'
const BASE_URL = 'https://mcp.example.com'
const KID = 'test-key'

const minimalUser = {
  id: 7,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  alternateEmails: null,
  jobTitle: null,
  phone: null,
  timezone: 'UTC',
  photoUrl: null,
  language: 'en',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
}

describe('createBearerRequestHandler', () => {
  let privateKey: CryptoKey
  let publicJwk: JWK
  let jwksServer: FixtureServer
  let freescoutServer: FixtureServer
  let handler: (request: Request) => Promise<Response>
  let downstreamCalls: { request: Request; authInfo: unknown }[]

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true })
    privateKey = keyPair.privateKey
    publicJwk = { ...(await exportJWK(keyPair.publicKey)), kid: KID, alg: 'RS256', use: 'sig' }
  })

  beforeEach(async () => {
    jwksServer = await startFixtureServer()
    freescoutServer = await startFixtureServer()

    const verifier = new OAuthBearerTokenVerifier(
      createOAuthConfiguration(BASE_URL, `${jwksServer.url}/jwks`, ISSUER, AUDIENCE)
    )
    const userResolver = new UserResolver(new Client({ baseUrl: `${freescoutServer.url}/api`, key: 'test-key' }))

    downstreamCalls = []
    handler = createBearerRequestHandler({
      verifier,
      userResolver,
      protectedResourceMetadataMcpUrl: new URL('/.well-known/oauth-protected-resource/mcp', BASE_URL),
      handleRequest: async (request, extras) => {
        downstreamCalls.push({ request, authInfo: extras.authInfo })
        return new Response('downstream-ok', { status: 200 })
      }
    })
  })

  afterEach(async () => {
    await jwksServer.stop()
    await freescoutServer.stop()
  })

  /** Signs a JWT against the test keypair, with optional claim overrides. */
  async function signToken(overrides: Record<string, unknown> = {}): Promise<string> {
    const payload: Record<string, unknown> = {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: 'user-123',
      azp: 'client-abc',
      email: 'ada@example.com',
      email_verified: true,
      ...overrides
    }
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key]
    }
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
  }

  /** Builds a `Request` carrying the supplied Authorization header (or none). */
  function request(authorization?: string): Request {
    return new Request('https://mcp.example.com/mcp', {
      method: 'POST',
      headers: authorization ? { Authorization: authorization } : {}
    })
  }

  /** Queues a successful FreeScout users-list response for the test resolver. */
  function respondWithUser(): void {
    freescoutServer.respondWith({
      body: {
        _embedded: { users: [minimalUser] },
        page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
      }
    })
  }

  it('is expected to return 401 with `Missing bearer token` when no Authorization header is present', async () => {
    const response = await handler(request())

    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toContain('Bearer resource_metadata=')
    expect(await response.json()).toEqual({ error: 'invalid_token', error_description: 'Missing bearer token' })
    expect(downstreamCalls).toHaveLength(0)
  })

  it('is expected to return 401 when the bearer token is malformed', async () => {
    jwksServer.respondWith({ body: { keys: [publicJwk] } })

    const response = await handler(request('Bearer not-a-jwt'))

    expect(response.status).toBe(401)
    const body = (await response.json()) as { error_description: string }
    expect(body.error_description).toMatch(/verification failed/i)
    expect(downstreamCalls).toHaveLength(0)
  })

  it('is expected to return 401 when the token is valid but the email claim is missing', async () => {
    jwksServer.respondWith({ body: { keys: [publicJwk] } })
    const token = await signToken({ email: undefined })

    const response = await handler(request(`Bearer ${token}`))

    expect(response.status).toBe(401)
    expect(downstreamCalls).toHaveLength(0)
    expect(freescoutServer.lastRequest()).toBeUndefined()
  })

  it('is expected to return 401 when the verified email has no FreeScout user', async () => {
    jwksServer.respondWith({ body: { keys: [publicJwk] } })
    freescoutServer.respondWith({
      body: {
        _embedded: { users: [] },
        page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
      }
    })
    const token = await signToken()

    const response = await handler(request(`Bearer ${token}`))

    expect(response.status).toBe(401)
    const body = (await response.json()) as { error_description: string }
    expect(body.error_description).toMatch(/No FreeScout user/i)
    expect(downstreamCalls).toHaveLength(0)
  })

  it('is expected to delegate to the downstream handler with authInfo.extra.user populated on success', async () => {
    jwksServer.respondWith({ body: { keys: [publicJwk] } })
    respondWithUser()
    const token = await signToken()

    const response = await handler(request(`Bearer ${token}`))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('downstream-ok')
    expect(downstreamCalls).toHaveLength(1)
    const { authInfo } = downstreamCalls[0] as {
      authInfo: { extra: { user: typeof minimalUser; email: string } }
    }
    expect(authInfo.extra.user).toEqual(minimalUser)
    expect(authInfo.extra.email).toBe('ada@example.com')
  })

  it('is expected to serve subsequent requests with the same email from the resolver cache (no second FreeScout call)', async () => {
    jwksServer.respondWith({ body: { keys: [publicJwk] } })
    respondWithUser()
    const token = await signToken()

    await handler(request(`Bearer ${token}`))
    // No second FreeScout response queued — if the resolver re-hit FreeScout, the second call
    // would receive the fixture-server's 500 ("no response queued") and surface as a 401.
    const second = await handler(request(`Bearer ${token}`))

    expect(second.status).toBe(200)
    expect(downstreamCalls).toHaveLength(2)
  })
})
