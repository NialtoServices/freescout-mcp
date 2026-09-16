import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '../lib/freescout'
import { startFixtureServer, type FixtureServer } from '../test/fixture-server'
import { AuthenticationError, UserResolver } from './freescout'

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
