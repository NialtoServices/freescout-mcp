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

const minimalConversation = {
  id: 100,
  number: 1001,
  threadsCount: 1,
  type: 'email',
  status: 'active',
  state: 'published',
  subject: 'Help',
  preview: null,
  mailboxId: 5,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  closedAt: null,
  userUpdatedAt: null,
  customerWaitingSince: { time: null, friendly: null, latestReplyFrom: null },
  source: { type: 'email', via: 'customer' },
  _embedded: {}
}

const minimalThread = {
  id: 999,
  type: 'note',
  status: null,
  state: 'published',
  action: { type: null, text: null, associatedEntities: {} },
  body: '<p>note body</p>',
  source: { type: 'email', via: 'customer' },
  createdAt: '2024-01-01T00:00:00Z',
  openedAt: null,
  rating_comment: null
}

describe('conversation tools', () => {
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

  describe('list_conversations', () => {
    it('is expected to GET /conversations and surface the parsed listing', async () => {
      freescout.respondWith({
        body: {
          _embedded: { conversations: [minimalConversation] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await loopback.callTool('list_conversations', {})

      expect(freescout.lastRequest()?.path).toContain('/api/conversations')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Conversations')
      expect(text).toContain('| 100 | 1001 | Help | active | 5')
    })

    it('is expected to comma-join array filters into the query string', async () => {
      freescout.respondWith({
        body: {
          _embedded: { conversations: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_conversations', { status: ['active', 'pending'] })

      expect(freescout.lastRequest()?.path).toContain('status=active%2Cpending')
    })

    it('is expected to forward the subject filter to FreeScout for substring search', async () => {
      freescout.respondWith({
        body: {
          _embedded: { conversations: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_conversations', { subject: 'billing question' })

      expect(freescout.lastRequest()?.path).toContain('subject=billing+question')
    })
  })

  describe('get_conversation', () => {
    it('is expected to GET /conversations/{id} and render the record view', async () => {
      freescout.respondWith({ body: minimalConversation })

      const result = await loopback.callTool('get_conversation', { conversationId: 100 })

      expect(freescout.lastRequest()?.path).toContain('/api/conversations/100')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Conversation #1001 (id 100)')
      expect(text).toContain('Help')
    })

    it('is expected to tolerate `action.associatedEntities` arriving as an empty array (PHP json_encode quirk)', async () => {
      freescout.respondWith({
        body: {
          ...minimalConversation,
          threadsCount: 1,
          _embedded: {
            threads: [
              {
                ...minimalThread,
                action: { type: null, text: null, associatedEntities: [] }
              }
            ]
          }
        }
      })

      const result = await loopback.callTool('get_conversation', { conversationId: 100 })

      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Conversation #1001')
    })
  })

  describe('create_conversation', () => {
    it('is expected to POST /conversations with a single draft message thread authored by the current user', async () => {
      freescout.respondWith({
        status: 201,
        headers: { 'Resource-ID': '100' },
        body: { ...minimalConversation, id: 100 }
      })

      const result = await loopback.callTool('create_conversation', {
        mailboxId: 5,
        subject: 'Hello',
        customerEmail: 'mark@example.com',
        text: 'Hi Mark.'
      })

      const request = freescout.lastRequest()
      expect(request?.method).toBe('POST')
      expect(request?.path).toBe('/api/conversations')
      const body = JSON.parse(request?.body ?? '{}')
      expect(body.mailboxId).toBe(5)
      expect(body.subject).toBe('Hello')
      expect(body.customer).toEqual({ email: 'mark@example.com' })
      expect(body.threads).toHaveLength(1)
      expect(body.threads[0]).toMatchObject({
        type: 'message',
        state: 'draft',
        user: currentUser.id
      })
      expect(body.threads[0].text).toContain('<p>Hi Mark.</p>')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('Created conversation #1001')
      expect(text).toContain('not sent')
    })
  })

  describe('add_conversation_note', () => {
    it('is expected to POST a note thread carrying the current user id and HTML-converted body', async () => {
      freescout.respondWith({ status: 201, headers: { 'Resource-ID': '999' }, body: { ...minimalThread, id: 999 } })

      await loopback.callTool('add_conversation_note', { conversationId: 100, text: 'Customer is a VIP.' })

      const request = freescout.lastRequest()
      expect(request?.path).toBe('/api/conversations/100/threads')
      const body = JSON.parse(request?.body ?? '{}')
      expect(body.type).toBe('note')
      expect(body.user).toBe(currentUser.id)
      expect(body.text).toBe('<p>Customer is a VIP.</p>')
    })
  })

  describe('draft_conversation_reply', () => {
    it('is expected to POST a draft message thread (never published) authored by the current user', async () => {
      freescout.respondWith({
        status: 201,
        headers: { 'Resource-ID': '999' },
        body: { ...minimalThread, id: 999, type: 'message', state: 'draft' }
      })

      const result = await loopback.callTool('draft_conversation_reply', {
        conversationId: 100,
        text: 'Thanks for getting in touch.'
      })

      const body = JSON.parse(freescout.lastRequest()?.body ?? '{}')
      expect(body).toMatchObject({
        type: 'message',
        state: 'draft',
        user: currentUser.id
      })
      expect(body.text).toBe('<p>Thanks for getting in touch.</p>')
      expect(result.structuredContent).toMatchObject({
        conversationId: 100,
        state: 'draft',
        thread: { id: 999, state: 'draft' }
      })
    })

    it('is expected never to send `state: "published"` regardless of input', async () => {
      freescout.respondWith({
        status: 201,
        headers: { 'Resource-ID': '999' },
        body: { ...minimalThread, id: 999, type: 'message', state: 'draft' }
      })

      // The tool has no `send`/`state` parameter, so there's no way to even ask for `published`.
      // This test pins that contract: the outbound body always carries state: 'draft'.
      await loopback.callTool('draft_conversation_reply', { conversationId: 100, text: 'x' })

      expect(JSON.parse(freescout.lastRequest()?.body ?? '{}').state).toBe('draft')
    })
  })

  describe('update_conversation', () => {
    it('is expected to PUT /conversations/{id} with byUser populated from the current user', async () => {
      freescout.respondWith({ status: 204 })

      await loopback.callTool('update_conversation', { conversationId: 100, status: 'closed' })

      const request = freescout.lastRequest()
      expect(request?.method).toBe('PUT')
      expect(request?.path).toBe('/api/conversations/100')
      const body = JSON.parse(request?.body ?? '{}')
      expect(body).toEqual({ status: 'closed', byUser: currentUser.id })
    })
  })

  describe('list_conversation_timelogs', () => {
    it('is expected to GET /conversations/{id}/timelogs', async () => {
      freescout.respondWith({
        body: {
          _embedded: { timelogs: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_conversation_timelogs', { conversationId: 100 })

      expect(freescout.lastRequest()?.path).toContain('/api/conversations/100/timelogs')
    })
  })

  describe('update_conversation_tags', () => {
    it('is expected to PUT /conversations/{id}/tags replacing the full tag set', async () => {
      freescout.respondWith({ status: 204 })

      await loopback.callTool('update_conversation_tags', { conversationId: 100, tags: ['vip', 'billing'] })

      expect(freescout.lastRequest()?.method).toBe('PUT')
      expect(freescout.lastRequest()?.path).toBe('/api/conversations/100/tags')
      expect(JSON.parse(freescout.lastRequest()?.body ?? '{}')).toEqual({ tags: ['vip', 'billing'] })
    })
  })

  describe('delete_conversation', () => {
    it('is expected to issue a DELETE to /conversations/{id} and report success', async () => {
      freescout.respondWith({ status: 204 })

      const result = await loopback.callTool('delete_conversation', { conversationId: 100 })

      expect(freescout.lastRequest()?.method).toBe('DELETE')
      expect(freescout.lastRequest()?.path).toBe('/api/conversations/100')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('Permanently deleted conversation #100')
      expect(text).toContain('cannot be reversed')
      expect(result.structuredContent).toEqual({ conversationId: 100, deleted: true })
    })
  })

  describe('update_conversation_custom_fields', () => {
    it('is expected to PUT /conversations/{id}/custom_fields with the supplied field values', async () => {
      freescout.respondWith({ status: 204 })

      await loopback.callTool('update_conversation_custom_fields', {
        conversationId: 100,
        customFields: [{ id: 11, value: 'high' }]
      })

      expect(freescout.lastRequest()?.path).toBe('/api/conversations/100/custom_fields')
      expect(JSON.parse(freescout.lastRequest()?.body ?? '{}')).toEqual({
        customFields: [{ id: 11, value: 'high' }]
      })
    })
  })
})
