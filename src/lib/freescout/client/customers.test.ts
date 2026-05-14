import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { CustomersClient } from './customers'
import { APIError } from './errors'
import { Transport } from './transport'

const minimalCustomer = {
  id: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  jobTitle: null,
  company: null,
  photoType: null,
  photoUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  notes: null,
  _embedded: {}
}

describe('CustomersClient', () => {
  let server: FixtureServer
  let client: CustomersClient

  beforeEach(async () => {
    server = await startFixtureServer()
    client = new CustomersClient(new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' }))
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('list', () => {
    it('is expected to issue a GET request to /customers carrying the API key header', async () => {
      server.respondWith({
        body: {
          _embedded: { customers: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.list()

      const request = server.lastRequest()
      expect(request?.method).toBe('GET')
      expect(request?.path).toBe('/api/customers')
      expect(request?.headers['x-freescout-api-key']).toBe('test-key')
    })

    it('is expected to serialise query parameters into the request URL', async () => {
      server.respondWith({
        body: {
          _embedded: { customers: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await client.list({ email: 'ada@example.com', page: 2, pageSize: 10 })

      const request = server.lastRequest()
      expect(request?.path).toContain('email=ada%40example.com')
      expect(request?.path).toContain('page=2')
      expect(request?.path).toContain('pageSize=10')
    })

    it('is expected to return the parsed paginated result from a successful response', async () => {
      server.respondWith({
        body: {
          _embedded: { customers: [minimalCustomer] },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await client.list()

      expect(result._embedded.customers).toHaveLength(1)
      expect(result._embedded.customers[0]?.id).toBe(1)
      expect(result.page.totalElements).toBe(1)
    })

    it('is expected to throw an APIError carrying the upstream status when the response is not 2xx', async () => {
      server.respondWith({ status: 403, body: { message: 'forbidden' } })

      const error = await client.list().catch((caught) => caught)

      expect(error).toBeInstanceOf(APIError)
      expect(error.status).toBe(403)
      expect(error.data).toEqual({ message: 'forbidden' })
    })
  })

  describe('get', () => {
    it('is expected to issue a GET request to /customers/{id}', async () => {
      server.respondWith({ body: minimalCustomer })

      const customer = await client.get(42)

      expect(server.lastRequest()?.method).toBe('GET')
      expect(server.lastRequest()?.path).toBe('/api/customers/42')
      expect(customer.id).toBe(1)
    })
  })

  describe('create', () => {
    it('is expected to POST the supplied body and surface the Resource-ID header value', async () => {
      server.respondWith({
        status: 201,
        headers: { 'Resource-ID': '7' },
        body: { ...minimalCustomer, id: 7 }
      })

      const result = await client.create({ firstName: 'Ada' })

      const request = server.lastRequest()
      expect(request?.method).toBe('POST')
      expect(request?.path).toBe('/api/customers')
      expect(JSON.parse(request?.body ?? '{}')).toEqual({ firstName: 'Ada' })
      expect(result.resourceId).toBe(7)
      expect(result.data.id).toBe(7)
    })

    it('is expected not to populate resourceId when the Resource-ID header is absent', async () => {
      server.respondWith({ status: 201, body: { ...minimalCustomer, id: 7 } })

      const result = await client.create({ firstName: 'Ada' })

      expect(result.resourceId).toBeUndefined()
    })
  })

  describe('update', () => {
    it('is expected to issue a PUT to /customers/{id} with the body and not return a value', async () => {
      server.respondWith({ status: 204 })

      const result = await client.update(7, { firstName: 'Augusta' })

      expect(server.lastRequest()?.method).toBe('PUT')
      expect(server.lastRequest()?.path).toBe('/api/customers/7')
      expect(JSON.parse(server.lastRequest()?.body ?? '{}')).toEqual({ firstName: 'Augusta' })
      expect(result).toBeUndefined()
    })
  })

  describe('updateFields', () => {
    it('is expected to PUT to /customers/{id}/customer_fields with the supplied field values', async () => {
      server.respondWith({ status: 204 })

      await client.updateFields(7, { customerFields: [{ id: 1, value: 'manual' }] })

      expect(server.lastRequest()?.path).toBe('/api/customers/7/customer_fields')
      expect(JSON.parse(server.lastRequest()?.body ?? '{}')).toEqual({
        customerFields: [{ id: 1, value: 'manual' }]
      })
    })
  })
})
