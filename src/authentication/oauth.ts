import { type AuthInfo } from '@modelcontextprotocol/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/** Error thrown when bearer-token verification fails. The message is safe to surface to clients. */
export class BearerTokenVerificationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BearerTokenVerificationError'
  }
}

/** RFC 9728 protected-resource metadata path. */
export const OAUTH_PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource'

/** RFC 9728 protected-resource metadata path for the MCP endpoint. */
export const OAUTH_PROTECTED_RESOURCE_METADATA_MCP_PATH = '/.well-known/oauth-protected-resource/mcp'

/** OAuth configuration for the MCP server. */
export interface OAuthConfiguration {
  /** Base URL of the MCP server (e.g. `https://mcp.example.com`). */
  baseUrl: URL

  /** URL for the MCP endpoint (e.g. `https://mcp.example.com/mcp`). */
  mcpUrl: URL

  /** URL for the protected-resource metadata. */
  protectedResourceMetadataUrl: URL

  /** URL for the protected-resource metadata about the MCP endpoint. */
  protectedResourceMetadataMcpUrl: URL

  /** URL of the JWKS endpoint of the upstream OAuth authorization server. */
  jwksUrl: URL

  /** URL of the issuer used by the upstream OAuth authorization server, expected as the `iss` claim. */
  issuerUrl: URL

  /** Audience set by the upstream OAuth authorization server, expected as the `aud` claim. */
  audience: string
}

/**
 * Builds an OAuth configuration object for the MCP server based on the given parameters, suitable for use in both the
 * server implementation and in the protected-resource metadata advertised to clients.
 *
 * @param baseUrl Base URL of the MCP server (e.g. `https://mcp.example.com`).
 * @param jwksUrl URL of the JWKS endpoint of the upstream OAuth authorization server.
 * @param issuerUrl URL of the issuer used by the upstream OAuth authorization server.
 * @param audience Audience set by the upstream OAuth authorization server.
 * @returns OAuth configuration object for the MCP server.
 */
export function createOAuthConfiguration(
  baseUrl: string,
  jwksUrl: string,
  issuerUrl: string,
  audience: string
): OAuthConfiguration {
  return {
    baseUrl: new URL(baseUrl),
    mcpUrl: new URL('/mcp', baseUrl),
    protectedResourceMetadataUrl: new URL(OAUTH_PROTECTED_RESOURCE_METADATA_PATH, baseUrl),
    protectedResourceMetadataMcpUrl: new URL(OAUTH_PROTECTED_RESOURCE_METADATA_MCP_PATH, baseUrl),
    jwksUrl: new URL(jwksUrl),
    issuerUrl: new URL(issuerUrl),
    audience
  }
}

/**
 * Returns RFC 9728 protected-resource metadata pointing clients at the upstream OAuth authorization server.
 *
 * @param configuration OAuth configuration advertised to clients.
 * @returns Metadata object suitable for serving as JSON.
 */
export function createProtectedResourceMetadata(configuration: OAuthConfiguration) {
  return {
    resource: configuration.mcpUrl.href,
    authorization_servers: [configuration.issuerUrl.href],
    bearer_methods_supported: ['header'],
    resource_name: 'FreeScout MCP',
    resource_documentation: configuration.baseUrl.href,
    scopes_supported: ['email', 'offline_access', 'freescout:access']
  }
}

/**
 * Verifies bearer access tokens issued by an upstream OAuth authorization server.
 */
export class OAuthBearerTokenVerifier {
  /** OAuth configuration for the MCP server. */
  private readonly configuration: OAuthConfiguration

  /** JSON Web Key Set (JWKS) used to verify access tokens. */
  private readonly remoteJWKSet: ReturnType<typeof createRemoteJWKSet>

  /**
   * Creates a verifier for OAuth bearer tokens issued by the configured authorization server.
   *
   * @param configuration OAuth configuration for the MCP server.
   */
  public constructor(configuration: OAuthConfiguration) {
    this.configuration = configuration
    this.remoteJWKSet = createRemoteJWKSet(configuration.jwksUrl)
  }

  /**
   * Verifies the given bearer token and extracts authentication information.
   *
   * @param token Bearer access token to verify.
   * @returns Authentication information extracted from the token.
   * @throws {Error} When verification fails (e.g. invalid signature, missing/invalid claims, etc.).
   */
  public async verify(token: string): Promise<AuthInfo> {
    let payload
    try {
      ;({ payload } = await jwtVerify(token, this.remoteJWKSet, {
        issuer: this.configuration.issuerUrl.href,
        audience: this.configuration.audience
      }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Signature or claims invalid'
      throw new BearerTokenVerificationError(`Bearer token verification failed: ${reason}`)
    }

    if (typeof payload.azp !== 'string' || payload.azp === '') {
      throw new BearerTokenVerificationError('Missing or invalid `azp` claim')
    }

    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new BearerTokenVerificationError('Missing or invalid `sub` claim')
    }

    if (typeof payload.email !== 'string' || payload.email === '') {
      throw new BearerTokenVerificationError('Missing or invalid `email` claim')
    }

    if (payload.email_verified !== true) {
      throw new BearerTokenVerificationError('Email is not verified by the authorization server')
    }

    return {
      token,
      clientId: payload.azp,
      scopes: typeof payload.scope === 'string' ? payload.scope.split(/\s+/).filter(Boolean) : [],
      expiresAt: typeof payload.exp === 'number' ? payload.exp : undefined,
      resource: this.configuration.mcpUrl,
      extra: {
        email: payload.email
      }
    }
  }
}
