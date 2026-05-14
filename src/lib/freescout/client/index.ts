import { ConversationsClient } from './conversations'
import { CustomersClient } from './customers'
import { MailboxesClient } from './mailboxes'
import { TagsClient } from './tags'
import { Transport, type TransportOptions } from './transport'
import { UsersClient } from './users'
import { WebhooksClient } from './webhooks'

export * from './errors'
export * from './transport'

/**
 * FreeScout API client exposing domain-specific subclients.
 *
 * All methods validate input and parse responses with Zod before returning data.
 * Use `client.users.list()` or `client.conversations.get(id)` to access specific API areas.
 */
export class Client {
  /** Conversation-related API operations. */
  public readonly conversations: ConversationsClient

  /** Customer-related API operations. */
  public readonly customers: CustomersClient

  /** Mailbox-related API operations. */
  public readonly mailboxes: MailboxesClient

  /** Tag-related API operations. */
  public readonly tags: TagsClient

  /** User-related API operations. */
  public readonly users: UsersClient

  /** Webhook-related API operations. */
  public readonly webhooks: WebhooksClient

  /**
   * Creates a composed FreeScout client with domain-specific subclients.
   *
   * @param options Transport connection settings shared by all subclients.
   * @returns A composed client exposing all FreeScout API areas.
   */
  public constructor(options: TransportOptions) {
    const transport = new Transport(options)
    this.conversations = new ConversationsClient(transport)
    this.customers = new CustomersClient(transport)
    this.mailboxes = new MailboxesClient(transport)
    this.tags = new TagsClient(transport)
    this.users = new UsersClient(transport)
    this.webhooks = new WebhooksClient(transport)
  }
}
