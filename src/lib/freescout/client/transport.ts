import { z } from 'zod'
import { APIError, parseErrorResponseBody } from './errors'

/** HTTP methods used by the FreeScout client transport layer. */
type HTTPMethod = 'HEAD' | 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/** Supported query string value shapes accepted by the base request helpers. */
type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>

/** Query string parameters keyed by parameter name. */
type QueryParameters = Record<string, QueryValue>

/** A created FreeScout resource together with the optional `Resource-ID` response header value. */
export type CreatedResource<T> = {
  /** Resource identifier extracted from the `Resource-ID` header when present. */
  resourceId?: number

  /** Parsed response body for the created resource. */
  data: T
}

/** Shared HTTP transport connection settings used by all FreeScout client instances. */
export interface TransportOptions {
  /** Base FreeScout API URL ending in `/api`, for example `https://example.com/api`. */
  baseUrl: string

  /** FreeScout API key sent using the `X-FreeScout-API-Key` header. */
  key: string
}

/**
 * Shared HTTP transport for the FreeScout API.
 *
 * One instance is constructed by {@link Client} and injected into each domain-specific subclient,
 * so connection-option validation and the underlying URL/key state are evaluated exactly once per
 * `Client`. Subclients call `transport.request(...)`, `transport.parseJSONResponse(...)`, and
 * `transport.parseResourceId(...)` rather than inheriting from this class.
 */
export class Transport {
  /** Normalized base FreeScout API URL used to resolve endpoint paths. */
  private baseUrl: URL

  /** FreeScout API key used for authenticated requests. */
  private key: string

  /**
   * Creates a FreeScout transport.
   *
   * @param options Transport connection settings.
   */
  public constructor(options: TransportOptions) {
    const { baseUrl, key } = options

    if (!baseUrl.match(/^https?:\/\/.+\/api\/?$/)) {
      throw new Error('Invalid API base URL. Must start with http:// or https:// and end with /api')
    }

    if (key.length === 0) {
      throw new Error('Invalid API key. Must be a non-empty string.')
    }

    this.baseUrl = new URL(baseUrl)
    this.key = key
  }

  /**
   * Resolves an endpoint path against the configured base URL and appends query parameters.
   *
   * Array values are joined with commas to match FreeScout's comma-separated query convention; `null`
   * and `undefined` values are skipped.
   *
   * @param path Endpoint path relative to the base URL (leading slashes are tolerated).
   * @param parameters Optional query parameters keyed by parameter name.
   * @returns Absolute request URL ready to be passed to `fetch`.
   */
  private buildUrl(path: string, parameters?: QueryParameters) {
    const url = new URL(`${this.baseUrl.href.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`)

    if (!parameters) return url

    for (const [key, rawValue] of Object.entries(parameters)) {
      if (rawValue === undefined || rawValue === null) continue

      const values = Array.isArray(rawValue) ? rawValue : [rawValue]
      url.searchParams.set(key, values.map((value) => String(value)).join(','))
    }

    return url
  }

  /**
   * Sends an authenticated request to the FreeScout API.
   *
   * @param options The HTTP method, API path, query parameters, and optional JSON body.
   * @returns The raw HTTP response.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async request(options: { method: HTTPMethod; path: string; parameters?: QueryParameters; body?: unknown }) {
    const { method, path, parameters, body } = options
    const requestURL = this.buildUrl(path, parameters)

    const response = await fetch(requestURL, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        'X-FreeScout-API-Key': this.key
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      throw new APIError({
        status: response.status,
        statusText: response.statusText,
        data: await parseErrorResponseBody(response)
      })
    }

    return response
  }

  /**
   * Parses a JSON response body using a Zod schema.
   *
   * @param response The HTTP response whose JSON body should be parsed.
   * @param schema The Zod schema used to validate and parse the response body.
   * @returns The parsed response body.
   */
  public async parseJSONResponse<TSchema extends z.ZodTypeAny>(response: Response, schema: TSchema) {
    return schema.parse(await response.json())
  }

  /**
   * Extracts the FreeScout `Resource-ID` response header when present.
   *
   * @param response The HTTP response containing the header.
   * @returns The parsed numeric resource ID or `undefined` when the header is missing or invalid.
   */
  public parseResourceId(response: Response) {
    const header = response.headers.get('Resource-ID')
    if (!header || !/^\d+$/.test(header)) return undefined

    const value = Number(header)
    return Number.isInteger(value) && value > 0 ? value : undefined
  }
}
