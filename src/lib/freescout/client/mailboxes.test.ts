import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { MailboxesClient } from './mailboxes'
import { Transport } from './transport'

const minimalMailbox = {
  id: 1,
  name: 'Support',
  email: 'support@example.com',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const minimalCustomField = {
  id: 1,
  name: 'Priority',
  type: 'singleline',
  required: false,
  sortOrder: 0
}

const minimalFolder = {
  id: 1,
  type: 1,
  name: 'Unassigned',
  totalCount: 0,
  activeCount: 0
}

describe('MailboxesClient', () => {
  let server: FixtureServer
  let client: MailboxesClient

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new MailboxesClient(new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' }))
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('list', () => {
    it('is expected to GET /mailboxes and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { mailboxes: [minimalMailbox] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.list()

      expect(server.lastRequest()?.method).toBe('GET')
      expect(server.lastRequest()?.path).toBe('/api/mailboxes')
      expect(result._embedded.mailboxes).toHaveLength(1)
    })

    it('is expected to forward userId and pagination parameters in the query string', async () => {
      server.respondWith({
        body: {
          _embedded: { mailboxes: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.list({ userId: 5, page: 2, pageSize: 10 })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('userId=5')
      expect(path).toContain('page=2')
      expect(path).toContain('pageSize=10')
    })
  })

  describe('listCustomFields', () => {
    it('is expected to GET /mailboxes/{id}/custom_fields and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { custom_fields: [minimalCustomField] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.listCustomFields(7)

      expect(server.lastRequest()?.path).toBe('/api/mailboxes/7/custom_fields')
      expect(result._embedded.custom_fields).toHaveLength(1)
    })
  })

  describe('listFolders', () => {
    it('is expected to GET /mailboxes/{id}/folders and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { folders: [minimalFolder] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.listFolders(7)

      expect(server.lastRequest()?.path).toBe('/api/mailboxes/7/folders')
      expect(result._embedded.folders).toHaveLength(1)
    })

    it('is expected to forward userId and folderId filters in the query string', async () => {
      server.respondWith({
        body: {
          _embedded: { folders: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.listFolders(7, { userId: 3, folderId: 11 })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('userId=3')
      expect(path).toContain('folderId=11')
    })
  })
})
