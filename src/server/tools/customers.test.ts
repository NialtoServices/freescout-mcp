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

const minimalCustomer = {
  id: 7,
  firstName: 'Mark',
  lastName: 'Twain',
  jobTitle: null,
  company: null,
  photoType: null,
  photoUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  notes: null,
  _embedded: {}
}

describe('customer tools', () => {
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

  describe('list_customers', () => {
    it('is expected to GET /customers and surface a result table', async () => {
      freescout.respondWith({
        body: {
          _embedded: {
            customers: [
              {
                ...minimalCustomer,
                _embedded: {
                  emails: [{ id: 1, value: 'mark@example.com', type: 'work' }]
                }
              }
            ]
          },
          page: { size: 50, totalElements: 1, totalPages: 1, number: 1 }
        }
      })

      const result = await loopback.callTool('list_customers', {})

      expect(freescout.lastRequest()?.method).toBe('GET')
      expect(freescout.lastRequest()?.path).toContain('/api/customers')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Customers')
      expect(text).toContain('| 7 | Mark Twain')
      expect(text).toContain('mark@example.com')
    })

    it('is expected to forward the email filter as a query parameter', async () => {
      freescout.respondWith({
        body: {
          _embedded: { customers: [] },
          page: { size: 50, totalElements: 0, totalPages: 0, number: 1 }
        }
      })

      await loopback.callTool('list_customers', { email: 'mark@example.com' })

      expect(freescout.lastRequest()?.path).toContain('email=mark%40example.com')
    })
  })

  describe('get_customer', () => {
    it('is expected to GET /customers/{id} and render the record', async () => {
      freescout.respondWith({ body: minimalCustomer })

      const result = await loopback.callTool('get_customer', { customerId: 7 })

      expect(freescout.lastRequest()?.path).toBe('/api/customers/7')
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('# Customer #7')
      expect(text).toContain('Mark Twain')
    })

    it('is expected to populate structuredContent with the parsed customer', async () => {
      freescout.respondWith({ body: minimalCustomer })

      const result = await loopback.callTool('get_customer', { customerId: 7 })

      expect(result.structuredContent).toMatchObject({ customer: { id: 7, firstName: 'Mark', lastName: 'Twain' } })
    })

    it('is expected to render empty _embedded sections as "_None_" placeholders', async () => {
      freescout.respondWith({ body: minimalCustomer })

      const result = await loopback.callTool('get_customer', { customerId: 7 })

      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('## Email Addresses')
      expect(text).toContain('_None_')
    })
  })

  describe('create_customer', () => {
    it('is expected to POST /customers with the supplied body and report the new ID', async () => {
      freescout.respondWith({
        status: 201,
        headers: { 'Resource-ID': '7' },
        body: { ...minimalCustomer, id: 7 }
      })

      const result = await loopback.callTool('create_customer', {
        firstName: 'Mark',
        email: 'mark@example.com'
      })

      const request = freescout.lastRequest()
      expect(request?.method).toBe('POST')
      expect(request?.path).toBe('/api/customers')
      expect(JSON.parse(request?.body ?? '{}')).toEqual({ firstName: 'Mark', email: 'mark@example.com' })
      const text = (result.content[0] as { text: string }).text
      expect(text).toContain('Created customer #7')
    })
  })

  describe('update_customer', () => {
    it('is expected to PUT /customers/{id} with only the supplied fields', async () => {
      freescout.respondWith({ status: 204 })

      await loopback.callTool('update_customer', { customerId: 7, firstName: 'Samuel' })

      const request = freescout.lastRequest()
      expect(request?.method).toBe('PUT')
      expect(request?.path).toBe('/api/customers/7')
      expect(JSON.parse(request?.body ?? '{}')).toEqual({ firstName: 'Samuel' })
    })
  })

  describe('update_customer_fields', () => {
    it('is expected to PUT /customers/{id}/customer_fields with the supplied field values', async () => {
      freescout.respondWith({ status: 204 })

      await loopback.callTool('update_customer_fields', {
        customerId: 7,
        customerFields: [{ id: 11, value: 'gold' }]
      })

      expect(freescout.lastRequest()?.path).toBe('/api/customers/7/customer_fields')
      expect(JSON.parse(freescout.lastRequest()?.body ?? '{}')).toEqual({
        customerFields: [{ id: 11, value: 'gold' }]
      })
    })
  })
})
