import { exportJWK, generateKeyPair, SignJWT, type JWK, type JWTPayload } from 'jose'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../test/fixture-server'
import {
  BearerTokenVerificationError,
  createOAuthConfiguration,
  createProtectedResourceMetadata,
  OAuthBearerTokenVerifier
} from './oauth'

const ISSUER = 'https://issuer.example.com/'
const AUDIENCE = 'freescout-mcp'
const BASE_URL = 'https://mcp.example.com'
const KID = 'test-key'

describe('createOAuthConfiguration', () => {
  it('is expected to derive the MCP and metadata URLs from the base URL', () => {
    const configuration = createOAuthConfiguration(BASE_URL, 'https://issuer.example.com/jwks', ISSUER, AUDIENCE)

    expect(configuration.mcpUrl.href).toBe('https://mcp.example.com/mcp')
    expect(configuration.protectedResourceMetadataUrl.pathname).toBe('/.well-known/oauth-protected-resource')
    expect(configuration.protectedResourceMetadataMcpUrl.pathname).toBe('/.well-known/oauth-protected-resource/mcp')
    expect(configuration.issuerUrl.href).toBe(ISSUER)
    expect(configuration.audience).toBe(AUDIENCE)
  })
})

describe('createProtectedResourceMetadata', () => {
  it('is expected to return RFC 9728-shaped metadata pointing at the configured authorization server', () => {
    const configuration = createOAuthConfiguration(BASE_URL, 'https://issuer.example.com/jwks', ISSUER, AUDIENCE)
    const metadata = createProtectedResourceMetadata(configuration)

    expect(metadata.resource).toBe('https://mcp.example.com/mcp')
    expect(metadata.authorization_servers).toEqual([ISSUER])
    expect(metadata.bearer_methods_supported).toEqual(['header'])
    expect(metadata.scopes_supported).toContain('email')
  })
})

describe('OAuthBearerTokenVerifier', () => {
  let privateKey: CryptoKey
  let publicJwk: JWK
  let server: FixtureServer
  let verifier: OAuthBearerTokenVerifier

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true })
    privateKey = keyPair.privateKey
    publicJwk = { ...(await exportJWK(keyPair.publicKey)), kid: KID, alg: 'RS256', use: 'sig' }
  })

  beforeEach(async () => {
    server = await startFixtureServer()
    const configuration = createOAuthConfiguration(BASE_URL, `${server.url}/jwks`, ISSUER, AUDIENCE)
    verifier = new OAuthBearerTokenVerifier(configuration)
  })

  afterEach(async () => {
    await server.stop()
  })

  /** Builds and signs a JWT with the test private key, allowing per-test claim overrides. */
  async function signToken(
    overrides: Partial<Record<string, unknown>> = {},
    headerOverrides: Partial<{ kid: string; alg: string }> = {}
  ): Promise<string> {
    const defaults: Record<string, unknown> = {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: 'user-123',
      azp: 'client-abc',
      email: 'ada@example.com',
      email_verified: true,
      scope: 'email freescout:access'
    }
    const payload: JWTPayload = { ...defaults, ...overrides }
    // Allow omitting claims by passing `undefined`.
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key]
    }

    return new SignJWT(payload)
      .setProtectedHeader({ alg: headerOverrides.alg ?? 'RS256', kid: headerOverrides.kid ?? KID })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
  }

  describe('verify (happy path)', () => {
    it('is expected to return AuthInfo populated from the token claims when verification succeeds', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken()

      const authInfo = await verifier.verify(token)

      expect(authInfo.token).toBe(token)
      expect(authInfo.clientId).toBe('client-abc')
      expect(authInfo.scopes).toEqual(['email', 'freescout:access'])
      expect(authInfo.resource?.href).toBe('https://mcp.example.com/mcp')
      expect(authInfo.extra).toMatchObject({ email: 'ada@example.com' })
      expect(typeof authInfo.expiresAt).toBe('number')
    })

    it('is expected to return an empty scopes array when the token has no scope claim', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ scope: undefined })

      const authInfo = await verifier.verify(token)

      expect(authInfo.scopes).toEqual([])
    })
  })

  describe('verify (claim validation)', () => {
    it('is expected to reject a token whose `azp` claim is missing', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ azp: undefined })

      const error = await verifier.verify(token).catch((caught) => caught)

      expect(error).toBeInstanceOf(BearerTokenVerificationError)
      expect(error.message).toMatch(/azp/i)
    })

    it('is expected to reject a token whose `sub` claim is missing', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ sub: undefined })

      const error = await verifier.verify(token).catch((caught) => caught)

      expect(error).toBeInstanceOf(BearerTokenVerificationError)
      expect(error.message).toMatch(/sub/i)
    })

    it('is expected to reject a token whose `email` claim is missing', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ email: undefined })

      const error = await verifier.verify(token).catch((caught) => caught)

      expect(error).toBeInstanceOf(BearerTokenVerificationError)
      expect(error.message).toMatch(/email/i)
    })

    it('is expected to reject a token whose `email_verified` claim is not the literal `true`', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ email_verified: false })

      const error = await verifier.verify(token).catch((caught) => caught)

      expect(error).toBeInstanceOf(BearerTokenVerificationError)
      expect(error.message).toMatch(/not verified/i)
    })
  })

  describe('verify (signature and issuer/audience checks)', () => {
    it('is expected to reject a token issued by a different `iss`', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ iss: 'https://attacker.example.com/' })

      await expect(verifier.verify(token)).rejects.toBeInstanceOf(BearerTokenVerificationError)
    })

    it('is expected to reject a token whose `aud` does not match', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })
      const token = await signToken({ aud: 'some-other-resource' })

      await expect(verifier.verify(token)).rejects.toBeInstanceOf(BearerTokenVerificationError)
    })

    it('is expected to reject a token signed with a key not present in the JWKS', async () => {
      const otherKeyPair = await generateKeyPair('RS256', { extractable: true })
      server.respondWith({ body: { keys: [publicJwk] } })

      const token = await new SignJWT({
        iss: ISSUER,
        aud: AUDIENCE,
        sub: 'user-123',
        azp: 'client-abc',
        email: 'ada@example.com',
        email_verified: true
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'unknown-kid' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(otherKeyPair.privateKey)

      await expect(verifier.verify(token)).rejects.toBeInstanceOf(BearerTokenVerificationError)
    })

    it('is expected to reject a malformed bearer token outright', async () => {
      server.respondWith({ body: { keys: [publicJwk] } })

      await expect(verifier.verify('not-a-jwt')).rejects.toBeInstanceOf(BearerTokenVerificationError)
    })
  })
})
