import {
  CreateWebhookBodySchema,
  ListWebhooksParametersSchema,
  PaginatedWebhooksSchema,
  WebhookSchema,
  type CreateWebhookBody,
  type ListWebhooksParameters,
  type PaginatedWebhooks,
  type Webhook
} from '../schema'
import { Transport, type CreatedResource } from './transport'

/** Client for FreeScout webhook operations. */
export class WebhooksClient {
  /**
   * Creates a webhooks client that issues requests via the given shared transport.
   *
   * @param transport Shared FreeScout HTTP transport.
   */
  public constructor(private readonly transport: Transport) {}

  /**
   * Lists configured webhooks with standard pagination.
   *
   * @param parameters Optional pagination settings.
   * @returns A paginated webhook result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async list(parameters?: ListWebhooksParameters): Promise<PaginatedWebhooks> {
    const response = await this.transport.request({
      method: 'GET',
      path: '/webhooks',
      parameters: ListWebhooksParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedWebhooksSchema)
  }

  /**
   * Creates a webhook subscription.
   *
   * FreeScout discards unknown event names before validation. The returned `resourceId`
   * is populated from the `Resource-ID` response header when present.
   *
   * @param body The webhook payload to send to FreeScout.
   * @returns The created webhook and optional `Resource-ID` header value.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async create(body: CreateWebhookBody): Promise<CreatedResource<Webhook>> {
    const response = await this.transport.request({
      method: 'POST',
      path: '/webhooks',
      body: CreateWebhookBodySchema.parse(body)
    })

    return {
      resourceId: this.transport.parseResourceId(response),
      data: await this.transport.parseJSONResponse(response, WebhookSchema)
    }
  }

  /**
   * Deletes a webhook by ID.
   *
   * @param webhookId The FreeScout webhook ID.
   * @returns A promise that resolves when the webhook is deleted.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async delete(webhookId: number): Promise<void> {
    await this.transport.request({
      method: 'DELETE',
      path: `/webhooks/${webhookId}`
    })
  }
}
