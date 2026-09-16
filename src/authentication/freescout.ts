import { Client, type User } from '../lib/freescout'

/** Thrown when an error occurs during the authentication process. */
export class AuthenticationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
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
