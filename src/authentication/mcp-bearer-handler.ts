import { type AuthInfo } from '@modelcontextprotocol/server'
import { AuthenticationError, type UserResolver } from './freescout'
import { BearerTokenVerificationError, type OAuthBearerTokenVerifier } from './oauth'

/** Inputs passed to the downstream MCP request handler after authentication has succeeded. */
export interface AuthenticatedRequestExtras {
  /** AuthInfo with `extra.user` populated with the resolved FreeScout user. */
  authInfo: AuthInfo
}

/** Configuration for {@link createBearerRequestHandler}. */
export interface BearerRequestHandlerOptions {
  /** Verifies the bearer token's signature and claims. */
  verifier: OAuthBearerTokenVerifier

  /** Resolves verified emails to FreeScout users (with caching). */
  userResolver: UserResolver

  /** URL advertised in the `WWW-Authenticate` header on 401 responses. */
  protectedResourceMetadataMcpUrl: URL

  /** Downstream handler invoked once the request is authenticated and the user is resolved. */
  handleRequest: (request: Request, extras: AuthenticatedRequestExtras) => Promise<Response>
}

/**
 * Builds the `Request → Response` handler that protects the MCP endpoint.
 *
 * Each invocation performs three checks in turn — bearer parsing, OAuth verification, FreeScout
 * user resolution — and returns a 401 response with an RFC 6750-shaped body if any fail. On
 * success the resolved user is attached to `authInfo.extra.user` and the request is delegated to
 * `handleRequest`.
 *
 * The handler has no Hono dependency; it operates on web-standard `Request`/`Response` objects so
 * it can be wired into any HTTP framework or driven directly from tests.
 */
export function createBearerRequestHandler(
  options: BearerRequestHandlerOptions
): (request: Request) => Promise<Response> {
  const { verifier, userResolver, protectedResourceMetadataMcpUrl, handleRequest } = options
  const wwwAuthenticate = `Bearer resource_metadata="${protectedResourceMetadataMcpUrl.href}"`

  /** Returns a JSON-body 401 with the canonical `invalid_token` shape. */
  function unauthorized(description: string): Response {
    return new Response(JSON.stringify({ error: 'invalid_token', error_description: description }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': wwwAuthenticate
      }
    })
  }

  return async (request: Request): Promise<Response> => {
    const authorization = request.headers.get('Authorization')
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!bearerToken) {
      return unauthorized('Missing bearer token')
    }

    let authInfo: AuthInfo
    try {
      authInfo = await verifier.verify(bearerToken)
    } catch (error) {
      const description = error instanceof BearerTokenVerificationError ? error.message : 'Invalid bearer token'
      return unauthorized(description)
    }

    // The verifier guarantees `extra.email` is set on success; the cast keeps that contract local.
    const email = (authInfo.extra as { email: string }).email
    let user
    try {
      user = await userResolver.resolve(email)
    } catch (error) {
      const description = error instanceof AuthenticationError ? error.message : 'User resolution failed'
      return unauthorized(description)
    }

    const enrichedAuthInfo: AuthInfo = { ...authInfo, extra: { ...authInfo.extra, user } }
    return handleRequest(request, { authInfo: enrichedAuthInfo })
  }
}
