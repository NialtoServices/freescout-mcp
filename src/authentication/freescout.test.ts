import { type ServerContext } from '@modelcontextprotocol/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '../lib/freescout'
import { startFixtureServer, type FixtureServer } from '../test/fixture-server'
import { AuthenticationError, extractEmail, readUserFromContext, UserResolver } from './freescout'

/** Builds a minimal `ServerContext`-shaped value carrying only the fields the functions under test read. */
function makeContext(extra: unknown | undefined): ServerContext {
  return { http: extra === undefined ? undefined : { authInfo: { extra } } } as unknown as ServerContext
}

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

describe('extractEmail', () => {
  it('is expected to return the email from a context carrying a string email in authInfo.extra', () => {
    expect(extractEmail(makeContext({ email: 'ada@example.com' }))).toBe('ada@example.com')
  })

  it('is expected to throw when no http authentication metadata is attached to the context', () => {
    expect(() => extractEmail(makeContext(undefined))).toThrow(AuthenticationError)
  })

  it('is expected to throw when authInfo.extra is null', () => {
    expect(() => extractEmail(makeContext(null))).toThrow(AuthenticationError)
  })

  it('is expected to throw when authInfo.extra has no email key', () => {
    expect(() => extractEmail(makeContext({}))).toThrow(AuthenticationError)
  })

  it('is expected to throw when the email value is the empty string', () => {
    expect(() => extractEmail(makeContext({ email: '' }))).toThrow(AuthenticationError)
  })

  it('is expected to throw when the email value is not a string', () => {
    expect(() => extractEmail(makeContext({ email: 42 }))).toThrow(AuthenticationError)
  })
})

describe('readUserFromContext', () => {
  it('is expected to return the user attached to authInfo.extra.user', () => {
    expect(readUserFromContext(makeContext({ user: minimalUser }))).toBe(minimalUser)
  })

  it('is expected to throw when no http authentication metadata is attached', () => {
    expect(() => readUserFromContext(makeContext(undefined))).toThrow(AuthenticationError)
  })

  it('is expected to throw when authInfo.extra has no user key', () => {
    expect(() => readUserFromContext(makeContext({ email: 'ada@example.com' }))).toThrow(AuthenticationError)
  })

  it('is expected to throw when authInfo.extra.user is not an object', () => {
    expect(() => readUserFromContext(makeContext({ user: 'ada@example.com' }))).toThrow(AuthenticationError)
  })

  it('is expected to throw when authInfo.extra.user lacks a numeric id', () => {
    expect(() => readUserFromContext(makeContext({ user: { email: 'ada@example.com' } }))).toThrow(AuthenticationError)
  })
})

describe('UserResolver', () => {
  let server: FixtureServer
  let client: Client

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new Client({ baseUrl: `${server.url}/api`, key: 'test-key' })
  })

  afterEach(async () => {
    await server.stop()
  })

  /** Queues a `_embedded.users` response containing the supplied users. */
  function respondWithUsers(users: (typeof minimalUser)[]): void {
    server.respondWith({
      body: {
        _embedded: { users },
        page: { size: 50, totalElements: users.length, totalPages: 1, number: 1 }
      }
    })
  }

  describe('resolve', () => {
    it('is expected to look the email up against FreeScout and return the matching user', async () => {
      respondWithUsers([minimalUser])
      const resolver = new UserResolver(client)

      const user = await resolver.resolve('ada@example.com')

      expect(server.lastRequest()?.path).toContain('email=ada%40example.com')
      expect(user.id).toBe(7)
    })

    it('is expected to throw an AuthenticationError when no FreeScout user matches the email', async () => {
      respondWithUsers([])
      const resolver = new UserResolver(client)

      await expect(resolver.resolve('ghost@example.com')).rejects.toBeInstanceOf(AuthenticationError)
    })

    it('is expected to serve a cached user without re-contacting FreeScout while the entry is fresh', async () => {
      respondWithUsers([minimalUser])
      const resolver = new UserResolver(client, 60_000)

      const firstUser = await resolver.resolve('ada@example.com')
      // No second response is queued; a second network call would 500. Cache must serve the result.
      const secondUser = await resolver.resolve('ada@example.com')

      expect(firstUser).toBe(secondUser)
    })

    it('is expected to re-fetch from FreeScout once the cached entry has expired', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        const resolver = new UserResolver(client, 1000)

        respondWithUsers([minimalUser])
        await resolver.resolve('ada@example.com')

        vi.advanceTimersByTime(1001) // tick past the TTL boundary
        respondWithUsers([{ ...minimalUser, firstName: 'Augusta' }])
        const refreshed = await resolver.resolve('ada@example.com')

        expect(refreshed.firstName).toBe('Augusta')
      } finally {
        vi.useRealTimers()
      }
    })

    it('is expected not to cache failed lookups, so onboarding remediates the next call', async () => {
      const resolver = new UserResolver(client)

      respondWithUsers([])
      await expect(resolver.resolve('ada@example.com')).rejects.toBeInstanceOf(AuthenticationError)

      respondWithUsers([minimalUser])
      const user = await resolver.resolve('ada@example.com')
      expect(user.id).toBe(7)
    })
  })
})
