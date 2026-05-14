import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { TagsClient } from './tags'
import { Transport } from './transport'

const minimalTag = { id: 1, name: 'vip' }

describe('TagsClient', () => {
  let server: FixtureServer
  let client: TagsClient

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new TagsClient(new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' }))
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('list', () => {
    it('is expected to GET /tags and return the parsed paginated result', async () => {
      server.respondWith({
        body: {
          _embedded: { tags: [minimalTag] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.list()

      expect(server.lastRequest()?.method).toBe('GET')
      expect(server.lastRequest()?.path).toBe('/api/tags')
      expect(result._embedded.tags).toHaveLength(1)
    })

    it('is expected to forward conversationId and pagination parameters in the query string', async () => {
      server.respondWith({
        body: {
          _embedded: { tags: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.list({ conversationId: 7, page: 1, pageSize: 10 })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('conversationId=7')
      expect(path).toContain('page=1')
      expect(path).toContain('pageSize=10')
    })
  })
})
