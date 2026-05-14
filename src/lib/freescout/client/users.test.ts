import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { Transport } from './transport'
import { UsersClient } from './users'

const minimalUser = {
  id: 1,
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

describe('UsersClient', () => {
  let server: FixtureServer
  let client: UsersClient

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new UsersClient(new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' }))
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('list', () => {
    it('is expected to GET /users and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { users: [minimalUser] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.list()

      expect(server.lastRequest()?.method).toBe('GET')
      expect(server.lastRequest()?.path).toBe('/api/users')
      expect(result._embedded.users).toHaveLength(1)
    })

    it('is expected to forward the email filter in the query string', async () => {
      server.respondWith({
        body: {
          _embedded: { users: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.list({ email: 'ada@example.com' })

      expect(server.lastRequest()?.path).toContain('email=ada%40example.com')
    })
  })

  describe('get', () => {
    it('is expected to GET /users/{id} and return the parsed user', async () => {
      server.respondWith({ body: minimalUser })

      const user = await client.get(42)

      expect(server.lastRequest()?.path).toBe('/api/users/42')
      expect(user.id).toBe(1)
    })
  })

  describe('create', () => {
    it('is expected to POST /users with the supplied body and surface the Resource-ID header', async () => {
      server.respondWith({
        status: 201,
        headers: { 'Resource-ID': '11' },
        body: { ...minimalUser, id: 11 }
      })

      const result = await client.create({
        firstName: 'Augusta',
        lastName: 'King',
        email: 'augusta@example.com'
      })

      expect(server.lastRequest()?.method).toBe('POST')
      expect(server.lastRequest()?.path).toBe('/api/users')
      expect(result.resourceId).toBe(11)
      expect(result.data.id).toBe(11)
    })
  })

  describe('delete', () => {
    it('is expected to DELETE /users/{id} with byUserId in the query string', async () => {
      server.respondWith({ status: 204 })

      await client.delete(11, { byUserId: 1 })

      expect(server.lastRequest()?.method).toBe('DELETE')
      expect(server.lastRequest()?.path).toContain('/api/users/11')
      expect(server.lastRequest()?.path).toContain('byUserId=1')
    })

    it('is expected to accept mailbox-specific reassignment keys of the form assignTo[<mailboxId>]', async () => {
      server.respondWith({ status: 204 })

      await client.delete(11, { byUserId: 1, 'assignTo[3]': 5 })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('byUserId=1')
      expect(path).toContain('assignTo%5B3%5D=5')
    })
  })
})
