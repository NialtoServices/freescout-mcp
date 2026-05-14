/** Options used to construct an {@link APIError}. */
export interface APIErrorOptions {
  /** HTTP status code returned by FreeScout. */
  status: number

  /** HTTP status text returned by FreeScout. */
  statusText: string

  /** Parsed error response body, when one could be extracted. */
  data?: unknown
}

/** Error thrown when the FreeScout API returns a non-success HTTP response. */
export class APIError extends Error {
  /** HTTP status code returned by FreeScout. */
  public readonly status: number

  /** HTTP status text returned by FreeScout. */
  public readonly statusText: string

  /** Parsed error response body, when one could be extracted. */
  public readonly data: unknown

  /**
   * Creates an API error wrapper around a failed FreeScout response.
   *
   * @param options The HTTP status metadata and parsed error payload.
   */
  public constructor(options: APIErrorOptions) {
    const { status, statusText, data } = options
    super(`Request failed with HTTP status ${status} ${statusText}`)

    this.name = 'APIError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

/**
 * Parses the body of a failed FreeScout response.
 *
 * JSON responses are parsed as objects; all other responses are returned as plain text.
 *
 * @param response The failed HTTP response from FreeScout.
 * @returns The parsed error body, raw text body, or `undefined` when parsing fails.
 */
export async function parseErrorResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return await response.text()
  }

  try {
    return await response.json()
  } catch {
    return undefined
  }
}
