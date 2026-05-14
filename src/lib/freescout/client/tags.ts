import { ListTagsParametersSchema, PaginatedTagsSchema, type ListTagsParameters, type PaginatedTags } from '../schema'
import { Transport } from './transport'

/** Client for FreeScout tag operations. */
export class TagsClient {
  /**
   * Creates a tags client that issues requests via the given shared transport.
   *
   * @param transport Shared FreeScout HTTP transport.
   */
  public constructor(private readonly transport: Transport) {}

  /**
   * Lists tags, optionally restricted to a conversation.
   *
   * This endpoint requires the Tags module in FreeScout.
   *
   * @param parameters Optional tag filters and pagination settings.
   * @returns A paginated tag result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async list(parameters?: ListTagsParameters): Promise<PaginatedTags> {
    const response = await this.transport.request({
      method: 'GET',
      path: '/tags',
      parameters: ListTagsParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedTagsSchema)
  }
}
