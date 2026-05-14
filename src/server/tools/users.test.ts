import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '../../lib/freescout'
import { startFixtureServer, type FixtureServer } from '../../test/fixture-server'
import { startMcpLoopback, type McpLoopback } from '../../test/mcp-loopback'
import { createMCPServer } from '../index'

const currentUser = {
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

const minimalUser = {
  id: 42,
  firstName: 'Charles',
  lastName: 'Babbage',
  email: 'charles@example.com',
  role: 'user',
  alternateEmails: null,
  jobTitle: 'Engineer',
  phone: null,
  timezone: 'UTC',
  photoUrl: null,
  language: 'en',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
}

describe('user tools', () => {
  let freescout: FixtureServer
  let loopback: McpLoopback

  beforeEach(async () => {
    freescout = await startFixtureServer()
    const client = new Client({ baseUrl: `${freescout.url}/api`, key: 'test-key' })
    const server = createMCPServer(client, { getCurrentUser: () => currentUser })
    loopback = await startMcpLoopback(server)
  })

  afterEach(async () => {
    await loopback.stop()
    await freescout.stop()
  })

  describe('list_users', () => {
    it('is expected to GET /users and surface the result table', async () => {
      freescout.respondWith({
        body: {
          _embedded: { users: [minimalUser] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await loopback.callTool('list_users', {})

      expect(freescout.lastRequest()?.method).toBe('GET')
      expect(freescout.lastRequest()?.path).toContain('/api/users')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Users')
      expect(text).toContain('| 42 | Charles Babbage')
    })

    it('is expected to forward the email filter as a query parameter', async () => {
      freescout.respondWith({
        body: {
          _embedded: { users: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_users', { email: 'charles@example.com' })

      expect(freescout.lastRequest()?.path).toContain('email=charles%40example.com')
    })
  })

  describe('get_user', () => {
    it('is expected to GET /users/{id} and surface the record layout', async () => {
      freescout.respondWith({ body: minimalUser })

      const result = await loopback.callTool('get_user', { userId: 42 })

      expect(freescout.lastRequest()?.path).toBe('/api/users/42')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# User #42')
      expect(text).toContain('Charles Babbage')
    })
  })

  describe('whoami', () => {
    it('is expected to return the resolved current user without contacting FreeScout', async () => {
      // No FreeScout response queued — whoami must read solely from the injected getCurrentUser.
      const result = await loopback.callTool('whoami', {})

      expect(freescout.lastRequest()).toBeUndefined()
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Current User')
      expect(text).toContain('Ada Lovelace')
      expect(text).toContain('- ID: 1')
      expect(text).toContain('- Email: ada@example.com')
    })

    it('is expected to populate structuredContent with the resolved user', async () => {
      const result = await loopback.callTool('whoami', {})

      expect(result.structuredContent).toEqual({ user: currentUser })
    })
  })
})
