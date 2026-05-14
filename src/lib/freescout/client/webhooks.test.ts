import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { Transport } from './transport'
import { WebhooksClient } from './webhooks'

const minimalWebhook = {
  id: 1,
  url: 'https://hooks.example.com/freescout',
  events: ['convo.created'],
  lastRunTime: null,
  lastRunError: null
}

describe('WebhooksClient', () => {
  let server: FixtureServer
  let client: WebhooksClient

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new WebhooksClient(new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' }))
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('list', () => {
    it('is expected to GET /webhooks and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { webhooks: [minimalWebhook] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.list()

      expect(server.lastRequest()?.method).toBe('GET')
      expect(server.lastRequest()?.path).toBe('/api/webhooks')
      expect(result._embedded.webhooks).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('is expected to POST /webhooks with the supplied body and surface the Resource-ID header', async () => {
      server.respondWith({
        status: 201,
        headers: { 'Resource-ID': '3' },
        body: { ...minimalWebhook, id: 3 }
      })

      const result = await client.create({
        url: 'https://hooks.example.com/freescout',
        events: ['convo.created']
      })

      expect(server.lastRequest()?.method).toBe('POST')
      expect(server.lastRequest()?.path).toBe('/api/webhooks')
      expect(result.resourceId).toBe(3)
      expect(result.data.id).toBe(3)
    })
  })

  describe('delete', () => {
    it('is expected to DELETE /webhooks/{id}', async () => {
      server.respondWith({ status: 204 })

      await client.delete(3)

      expect(server.lastRequest()?.method).toBe('DELETE')
      expect(server.lastRequest()?.path).toBe('/api/webhooks/3')
    })
  })
})
