import { type ServerContext } from '@modelcontextprotocol/server'
import { Client, type User } from '../lib/freescout'

/** Thrown when an error occurs during the authentication process. */
export class AuthenticationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Extracts the email address from the OAuth bearer token claims attached to an MCP request.
 *
 * @param context The MCP request context.
 * @returns The email address extracted from the token claims.
 * @throws {AuthenticationError} When no authentication metadata or email is present.
 */
export function extractEmail(context: ServerContext): string {
  const extra = context.http?.authInfo?.extra
  if (typeof extra !== 'object' || extra === null) {
    throw new AuthenticationError('No authentication metadata attached to request')
  }

  const email = extra.email
  if (typeof email !== 'string' || email === '') {
    throw new AuthenticationError('No email found in authentication metadata')
  }

  return email
}

/**
 * Reads the resolved FreeScout user from the MCP request context's `authInfo.extra.user`. The HTTP
 * transport entry point places the user there after successful verification; this helper centralises
 * the runtime-checked read so call sites don't have to cast through the SDK's untyped `extra`.
 *
 * @param context The MCP request context.
 * @returns The FreeScout user attached to the request.
 * @throws {AuthenticationError} When no resolved user is attached. This indicates a transport
 *   wiring bug rather than a normal authentication failure.
 */
export function readUserFromContext(context: ServerContext): User {
  const candidate = context.http?.authInfo?.extra?.user
  if (!candidate || typeof candidate !== 'object' || !('id' in candidate) || typeof candidate.id !== 'number') {
    throw new AuthenticationError('No resolved FreeScout user attached to request context')
  }
  return candidate as User
}

/**
 * Resolves verified email addresses to FreeScout users, caching successful lookups for a
 * configurable TTL. Failed lookups are not cached, so an offboarding can be remediated by
 * re-onboarding the same email at any time.
 */
export class UserResolver {
  /** Cached successful resolutions, keyed by email address. */
  private readonly cache: Map<string, { user: User; expiresAt: number }>

  /**
   * Creates a user resolver backed by the given FreeScout client.
   *
   * @param client FreeScout API client used to perform email→user lookups.
   * @param ttlInMilliseconds How long (in milliseconds) a successful resolution is cached. Defaults to 60 seconds.
   */
  public constructor(
    private client: Client,
    private ttlInMilliseconds: number = 60_000
  ) {
    this.cache = new Map()
  }

  /**
   * Resolves an email address to a FreeScout user, returning a cached result when one is fresh.
   *
   * @param email Email address to look up.
   * @returns The FreeScout user with that email.
   * @throws {AuthenticationError} When no FreeScout user with the given email is found.
   */
  public async resolve(email: string): Promise<User> {
    const cached = this.cache.get(email)
    if (cached && cached.expiresAt > Date.now()) return cached.user

    const result = await this.client.users.list({ email })
    const user = result._embedded.users[0]
    if (!user) {
      this.cache.delete(email)
      throw new AuthenticationError(`No FreeScout user found with email ${email}`)
    }

    this.cache.set(email, { user, expiresAt: Date.now() + this.ttlInMilliseconds })
    return user
  }
}
