import {
  ConversationSchema,
  CreateConversationBodySchema,
  CreateThreadBodySchema,
  GetConversationParametersSchema,
  ListConversationsParametersSchema,
  ListConversationTimelogsParametersSchema,
  PaginatedConversationsSchema,
  PaginatedTimelogsSchema,
  ReplaceConversationTagsBodySchema,
  ThreadSchema,
  UpdateConversationBodySchema,
  UpdateConversationCustomFieldsBodySchema,
  type Conversation,
  type CreateConversationBody,
  type CreateThreadBody,
  type GetConversationParameters,
  type ListConversationsParameters,
  type ListConversationTimelogsParameters,
  type PaginatedConversations,
  type PaginatedTimelogs,
  type ReplaceConversationTagsBody,
  type Thread,
  type UpdateConversationBody,
  type UpdateConversationCustomFieldsBody
} from '../schema'
import { Transport, type CreatedResource } from './transport'

/** Client for FreeScout conversation, thread, timelog, and conversation-tag operations. */
export class ConversationsClient {
  /**
   * Creates a conversations client that issues requests via the given shared transport.
   *
   * @param transport Shared FreeScout HTTP transport.
   */
  public constructor(private readonly transport: Transport) {}

  /**
   * Lists conversations (default sort: newest-first by creation date; configurable via `sortField`
   * and `sortOrder`).
   *
   * Supports FreeScout list filters such as mailbox, status, assignee, customer lookup, and embeds.
   * Threads are omitted by default unless requested through `embed`.
   *
   * @param parameters Optional FreeScout conversation listing filters and pagination settings.
   * @returns A paginated conversation result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async list(parameters?: ListConversationsParameters): Promise<PaginatedConversations> {
    const response = await this.transport.request({
      method: 'GET',
      path: '/conversations',
      parameters: ListConversationsParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedConversationsSchema)
  }

  /**
   * Retrieves a single conversation.
   *
   * When `embed` is omitted, FreeScout includes threads by default. When `embed` is provided,
   * only the explicitly requested embedded collections are included.
   *
   * @param conversationId The FreeScout conversation ID.
   * @param parameters Optional embed configuration for the conversation response.
   * @returns The requested conversation.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async get(conversationId: number, parameters?: GetConversationParameters): Promise<Conversation> {
    const response = await this.transport.request({
      method: 'GET',
      path: `/conversations/${conversationId}`,
      parameters: GetConversationParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, ConversationSchema)
  }

  /**
   * Creates a conversation with at least one thread.
   *
   * The returned `resourceId` is populated from the `Resource-ID` response header when present.
   * FreeScout expects submitted threads in newest-first order.
   *
   * @param body The conversation payload to send to FreeScout.
   * @returns The created conversation and optional `Resource-ID` header value.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async create(body: CreateConversationBody): Promise<CreatedResource<Conversation>> {
    const response = await this.transport.request({
      method: 'POST',
      path: '/conversations',
      body: CreateConversationBodySchema.parse(body)
    })

    return {
      resourceId: this.transport.parseResourceId(response),
      data: await this.transport.parseJSONResponse(response, ConversationSchema)
    }
  }

  /**
   * Updates the subset of conversation fields supported by the FreeScout API.
   *
   * `byUser` is required by FreeScout when changing status, assignee, or mailbox.
   *
   * @param conversationId The FreeScout conversation ID.
   * @param body The partial conversation update payload.
   * @returns A promise that resolves when the update succeeds.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async update(conversationId: number, body: UpdateConversationBody): Promise<void> {
    await this.transport.request({
      method: 'PUT',
      path: `/conversations/${conversationId}`,
      body: UpdateConversationBodySchema.parse(body)
    })
  }

  /**
   * Deletes a conversation permanently.
   *
   * @param conversationId The FreeScout conversation ID.
   * @returns A promise that resolves when the conversation is deleted.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async delete(conversationId: number): Promise<void> {
    await this.transport.request({
      method: 'DELETE',
      path: `/conversations/${conversationId}`
    })
  }

  /**
   * Creates a reply or note on an existing conversation.
   *
   * The API accepts `customer`, `message`, and `note` thread types. The returned `resourceId`
   * is populated from the `Resource-ID` response header when present.
   *
   * @param conversationId The parent conversation ID.
   * @param body The thread payload to send to FreeScout.
   * @returns The created thread and optional `Resource-ID` header value.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async createThread(conversationId: number, body: CreateThreadBody): Promise<CreatedResource<Thread>> {
    const response = await this.transport.request({
      method: 'POST',
      path: `/conversations/${conversationId}/threads`,
      body: CreateThreadBodySchema.parse(body)
    })

    return {
      resourceId: this.transport.parseResourceId(response),
      data: await this.transport.parseJSONResponse(response, ThreadSchema)
    }
  }

  /**
   * Updates only the submitted conversation custom fields.
   *
   * This endpoint requires the Custom Fields module in FreeScout.
   *
   * @param conversationId The FreeScout conversation ID.
   * @param body The custom field values to update.
   * @returns A promise that resolves when the custom fields are updated.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async updateCustomFields(conversationId: number, body: UpdateConversationCustomFieldsBody): Promise<void> {
    await this.transport.request({
      method: 'PUT',
      path: `/conversations/${conversationId}/custom_fields`,
      body: UpdateConversationCustomFieldsBodySchema.parse(body)
    })
  }

  /**
   * Lists timelogs for a conversation, ordered newest-first.
   *
   * This endpoint requires the Time Tracking module in FreeScout.
   *
   * @param conversationId The FreeScout conversation ID.
   * @param parameters Optional timelog pagination settings.
   * @returns A paginated timelog result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async listTimelogs(
    conversationId: number,
    parameters?: ListConversationTimelogsParameters
  ): Promise<PaginatedTimelogs> {
    const response = await this.transport.request({
      method: 'GET',
      path: `/conversations/${conversationId}/timelogs`,
      parameters: ListConversationTimelogsParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedTimelogsSchema)
  }

  /**
   * Replaces the full tag set for a conversation.
   *
   * Tags omitted from the request are removed. Missing tags are created automatically by FreeScout.
   * This endpoint requires the Tags module.
   *
   * @param conversationId The FreeScout conversation ID.
   * @param body The full replacement tag payload.
   * @returns A promise that resolves when the conversation tags are replaced.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async replaceTags(conversationId: number, body: ReplaceConversationTagsBody): Promise<void> {
    await this.transport.request({
      method: 'PUT',
      path: `/conversations/${conversationId}/tags`,
      body: ReplaceConversationTagsBodySchema.parse(body)
    })
  }
}
