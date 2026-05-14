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

describe('tag tools', () => {
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

  describe('list_tags', () => {
    it('is expected to issue a GET request to /tags and forward the conversationId filter', async () => {
      freescout.respondWith({
        body: {
          _embedded: { tags: [{ id: 1, name: 'vip', counter: 3, color: 1 }] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await loopback.callTool('list_tags', { conversationId: 7 })

      expect(freescout.lastRequest()?.method).toBe('GET')
      const path = freescout.lastRequest()?.path ?? ''
      expect(path).toContain('/api/tags')
      expect(path).toContain('conversationId=7')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Tags')
      expect(text).toContain('| 1 | vip')
    })
  })
})
