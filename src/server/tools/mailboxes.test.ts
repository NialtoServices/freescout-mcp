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

const minimalMailbox = {
  id: 5,
  name: 'Support',
  email: 'support@example.com',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

describe('mailbox tools', () => {
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

  describe('list_mailboxes', () => {
    it('is expected to issue a GET request to /mailboxes and surface the parsed pagination summary', async () => {
      freescout.respondWith({
        body: {
          _embedded: { mailboxes: [minimalMailbox] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await loopback.callTool('list_mailboxes', {})

      expect(freescout.lastRequest()?.method).toBe('GET')
      expect(freescout.lastRequest()?.path).toContain('/api/mailboxes')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Mailboxes')
      expect(text).toContain('| 5 | Support | support@example.com')
    })

    it('is expected to forward pagination parameters to FreeScout', async () => {
      freescout.respondWith({
        body: {
          _embedded: { mailboxes: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 2 }
        }
      })

      await loopback.callTool('list_mailboxes', { page: 2, pageSize: 10 })

      const path = freescout.lastRequest()?.path ?? ''
      expect(path).toContain('page=2')
      expect(path).toContain('pageSize=10')
    })
  })

  describe('list_mailbox_folders', () => {
    it('is expected to issue a GET request to /mailboxes/{id}/folders', async () => {
      freescout.respondWith({
        body: {
          _embedded: { folders: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_mailbox_folders', { mailboxId: 5 })

      expect(freescout.lastRequest()?.path).toContain('/api/mailboxes/5/folders')
    })
  })

  describe('list_mailbox_custom_fields', () => {
    it('is expected to issue a GET request to /mailboxes/{id}/custom_fields', async () => {
      freescout.respondWith({
        body: {
          _embedded: { custom_fields: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_mailbox_custom_fields', { mailboxId: 5 })

      expect(freescout.lastRequest()?.path).toContain('/api/mailboxes/5/custom_fields')
    })
  })
})
