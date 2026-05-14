import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { ConversationsClient } from './conversations'
import { Transport } from './transport'

const minimalConversation = {
  id: 1,
  number: 1001,
  threadsCount: 1,
  type: 'email',
  status: 'active',
  state: 'published',
  subject: 'Hello',
  preview: 'Hello there',
  mailboxId: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  closedAt: null,
  userUpdatedAt: null,
  customerWaitingSince: { time: null, friendly: null, latestReplyFrom: null },
  source: { type: 'email', via: 'customer' },
  _embedded: {}
}

const minimalThread = {
  id: 1,
  type: 'message',
  status: null,
  state: null,
  action: { type: null, text: null, associatedEntities: {} },
  body: 'Hello',
  source: { type: 'email', via: 'customer' },
  createdAt: '2024-01-01T00:00:00Z',
  openedAt: null,
  rating_comment: null
}

const minimalTimelog = {
  id: 1,
  conversationStatus: 'active',
  paused: false,
  finished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

describe('ConversationsClient', () => {
  let server: FixtureServer
  let client: ConversationsClient

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new ConversationsClient(new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' }))
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('list', () => {
    it('is expected to GET /conversations and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { conversations: [minimalConversation] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.list()

      expect(server.lastRequest()?.method).toBe('GET')
      expect(server.lastRequest()?.path).toBe('/api/conversations')
      expect(result._embedded.conversations).toHaveLength(1)
    })

    it('is expected to comma-join array query parameters', async () => {
      server.respondWith({
        body: {
          _embedded: { conversations: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.list({ status: ['active', 'pending'], embed: ['threads', 'tags'] })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('status=active%2Cpending')
      expect(path).toContain('embed=threads%2Ctags')
    })
  })

  describe('get', () => {
    it('is expected to GET /conversations/{id} and return the parsed conversation', async () => {
      server.respondWith({ body: minimalConversation })

      const conversation = await client.get(42)

      expect(server.lastRequest()?.path).toBe('/api/conversations/42')
      expect(conversation.id).toBe(1)
    })

    it('is expected to apply embed query parameters when provided', async () => {
      server.respondWith({ body: minimalConversation })

      await client.get(42, { embed: ['threads'] })

      expect(server.lastRequest()?.path).toContain('embed=threads')
    })
  })

  describe('create', () => {
    it('is expected to POST /conversations and surface the Resource-ID header', async () => {
      server.respondWith({
        status: 201,
        headers: { 'Resource-ID': '5' },
        body: { ...minimalConversation, id: 5 }
      })

      const result = await client.create({
        type: 'email',
        subject: 'Hello',
        mailboxId: 1,
        status: 'active',
        customer: { email: 'ada@example.com' },
        threads: [
          {
            type: 'customer',
            text: 'Hello',
            customer: { email: 'ada@example.com' }
          }
        ]
      })

      expect(server.lastRequest()?.method).toBe('POST')
      expect(server.lastRequest()?.path).toBe('/api/conversations')
      expect(result.resourceId).toBe(5)
      expect(result.data.id).toBe(5)
    })
  })

  describe('update', () => {
    it('is expected to PUT /conversations/{id} with the supplied body', async () => {
      server.respondWith({ status: 204 })

      await client.update(7, { status: 'closed', byUser: 1 })

      expect(server.lastRequest()?.method).toBe('PUT')
      expect(server.lastRequest()?.path).toBe('/api/conversations/7')
      expect(JSON.parse(server.lastRequest()?.body ?? '{}')).toEqual({ status: 'closed', byUser: 1 })
    })
  })

  describe('delete', () => {
    it('is expected to DELETE /conversations/{id}', async () => {
      server.respondWith({ status: 204 })

      await client.delete(7)

      expect(server.lastRequest()?.method).toBe('DELETE')
      expect(server.lastRequest()?.path).toBe('/api/conversations/7')
    })
  })

  describe('createThread', () => {
    it('is expected to POST /conversations/{id}/threads and return the parsed thread plus Resource-ID', async () => {
      server.respondWith({
        status: 201,
        headers: { 'Resource-ID': '9' },
        body: { ...minimalThread, id: 9 }
      })

      const result = await client.createThread(7, { type: 'note', text: 'Internal' })

      expect(server.lastRequest()?.path).toBe('/api/conversations/7/threads')
      expect(result.resourceId).toBe(9)
      expect(result.data.id).toBe(9)
    })
  })

  describe('updateCustomFields', () => {
    it('is expected to PUT /conversations/{id}/custom_fields with the supplied body', async () => {
      server.respondWith({ status: 204 })

      await client.updateCustomFields(7, { customFields: [{ id: 1, value: 'high' }] })

      expect(server.lastRequest()?.path).toBe('/api/conversations/7/custom_fields')
      expect(JSON.parse(server.lastRequest()?.body ?? '{}')).toEqual({
        customFields: [{ id: 1, value: 'high' }]
      })
    })
  })

  describe('listTimelogs', () => {
    it('is expected to GET /conversations/{id}/timelogs and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { timelogs: [minimalTimelog] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.listTimelogs(7)

      expect(server.lastRequest()?.path).toBe('/api/conversations/7/timelogs')
      expect(result._embedded.timelogs).toHaveLength(1)
    })
  })

  describe('replaceTags', () => {
    it('is expected to PUT /conversations/{id}/tags with the supplied tag set', async () => {
      server.respondWith({ status: 204 })

      await client.replaceTags(7, { tags: ['vip', 'billing'] })

      expect(server.lastRequest()?.method).toBe('PUT')
      expect(server.lastRequest()?.path).toBe('/api/conversations/7/tags')
      expect(JSON.parse(server.lastRequest()?.body ?? '{}')).toEqual({ tags: ['vip', 'billing'] })
    })
  })
})
