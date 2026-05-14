import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { startFixtureServer, type FixtureServer } from '../../../test/fixture-server'
import { APIError } from './errors'
import { Transport } from './transport'

describe('Transport', () => {
  describe('constructor', () => {
    it('is expected to throw when the base URL does not start with http(s) and end with /api', () => {
      expect(() => new Transport({ baseUrl: 'ftp://example.com/api', key: 'k' })).toThrow(/Invalid API base URL/)
      expect(() => new Transport({ baseUrl: 'https://example.com', key: 'k' })).toThrow(/Invalid API base URL/)
    })

    it('is expected to throw when the API key is the empty string', () => {
      expect(() => new Transport({ baseUrl: 'https://example.com/api', key: '' })).toThrow(/Invalid API key/)
    })

    it('is expected to accept the documented base URL shape and a non-empty key', () => {
      expect(() => new Transport({ baseUrl: 'https://example.com/api', key: 'abc123' })).not.toThrow()
      expect(() => new Transport({ baseUrl: 'http://example.com/api/', key: 'abc123' })).not.toThrow()
    })
  })

  describe('request', () => {
    let server: FixtureServer
    let transport: Transport

    beforeEach(async () => {
      server = await startFixtureServer()
      transport = new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' })
    })

    afterEach(async () => {
      await server.stop()
    })

    it('is expected to send the API key in the X-FreeScout-API-Key header', async () => {
      server.respondWith({ body: {} })

      await transport.request({ method: 'GET', path: '/anything' })

      expect(server.lastRequest()?.headers['x-freescout-api-key']).toBe('test-key')
    })

    it('is expected to send Accept: application/json on every request', async () => {
      server.respondWith({ body: {} })

      await transport.request({ method: 'GET', path: '/anything' })

      expect(server.lastRequest()?.headers['accept']).toContain('application/json')
    })

    it('is expected not to send a Content-Type header when there is no body', async () => {
      server.respondWith({ body: {} })

      await transport.request({ method: 'GET', path: '/anything' })

      expect(server.lastRequest()?.headers['content-type']).toBeUndefined()
    })

    it('is expected to send a JSON Content-Type and serialised body when a body is provided', async () => {
      server.respondWith({ body: {} })

      await transport.request({ method: 'POST', path: '/anything', body: { hello: 'world' } })

      expect(server.lastRequest()?.headers['content-type']).toContain('application/json')
      expect(JSON.parse(server.lastRequest()?.body ?? '{}')).toEqual({ hello: 'world' })
    })

    it('is expected to flatten array query parameters into comma-separated values', async () => {
      server.respondWith({ body: {} })

      await transport.request({
        method: 'GET',
        path: '/anything',
        parameters: { ids: [1, 2, 3], single: 'one' }
      })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('ids=1%2C2%2C3')
      expect(path).toContain('single=one')
    })

    it('is expected to omit query parameters whose value is null or undefined', async () => {
      server.respondWith({ body: {} })

      await transport.request({
        method: 'GET',
        path: '/anything',
        parameters: { present: 'yes', missing: undefined, empty: null }
      })

      const path = server.lastRequest()?.path ?? ''
      expect(path).toContain('present=yes')
      expect(path).not.toContain('missing')
      expect(path).not.toContain('empty')
    })

    it('is expected to throw an APIError carrying the upstream status and parsed JSON body when the response is not 2xx', async () => {
      server.respondWith({ status: 404, body: { message: 'not found' } })

      const error = await transport.request({ method: 'GET', path: '/anything' }).catch((caught) => caught)

      expect(error).toBeInstanceOf(APIError)
      expect(error.status).toBe(404)
      expect(error.data).toEqual({ message: 'not found' })
    })

    it('is expected to surface a plain-text error body when the upstream Content-Type is not JSON', async () => {
      server.respondWith({
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: 'something broke'
      })

      const error = await transport.request({ method: 'GET', path: '/anything' }).catch((caught) => caught)

      expect(error.data).toBe('something broke')
    })
  })

  describe('parseResourceId', () => {
    let server: FixtureServer
    let transport: Transport

    beforeEach(async () => {
      server = await startFixtureServer()
      transport = new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' })
    })

    afterEach(async () => {
      await server.stop()
    })

    it('is expected to return the positive integer value of a well-formed Resource-ID header', async () => {
      server.respondWith({ status: 201, headers: { 'Resource-ID': '42' }, body: {} })

      const response = await transport.request({ method: 'POST', path: '/anything', body: {} })

      expect(transport.parseResourceId(response)).toBe(42)
    })

    it('is expected to return undefined when the Resource-ID header is absent', async () => {
      server.respondWith({ status: 201, body: {} })

      const response = await transport.request({ method: 'POST', path: '/anything', body: {} })

      expect(transport.parseResourceId(response)).toBeUndefined()
    })

    it('is expected to return undefined when the Resource-ID header contains non-numeric characters', async () => {
      server.respondWith({ status: 201, headers: { 'Resource-ID': '42abc' }, body: {} })

      const response = await transport.request({ method: 'POST', path: '/anything', body: {} })

      expect(transport.parseResourceId(response)).toBeUndefined()
    })
  })

  describe('parseJSONResponse', () => {
    let server: FixtureServer
    let transport: Transport

    beforeEach(async () => {
      server = await startFixtureServer()
      transport = new Transport({ baseUrl: `${server.url}/api`, key: 'test-key' })
    })

    afterEach(async () => {
      await server.stop()
    })

    it('is expected to parse the response body with the supplied Zod schema and return the typed value', async () => {
      server.respondWith({ body: { value: 'hello' } })

      const response = await transport.request({ method: 'GET', path: '/anything' })
      const parsed = await transport.parseJSONResponse(response, z.object({ value: z.string() }))

      expect(parsed).toEqual({ value: 'hello' })
    })

    it('is expected to throw a Zod error when the response body does not match the schema', async () => {
      server.respondWith({ body: { value: 123 } })

      const response = await transport.request({ method: 'GET', path: '/anything' })

      await expect(transport.parseJSONResponse(response, z.object({ value: z.string() }))).rejects.toThrow()
    })
  })
})
