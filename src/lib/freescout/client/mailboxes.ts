import {
  ListMailboxCustomFieldsParametersSchema,
  ListMailboxesParametersSchema,
  ListMailboxFoldersParametersSchema,
  PaginatedFoldersSchema,
  PaginatedMailboxCustomFieldsSchema,
  PaginatedMailboxesSchema,
  type ListMailboxCustomFieldsParameters,
  type ListMailboxesParameters,
  type ListMailboxFoldersParameters,
  type PaginatedFolders,
  type PaginatedMailboxCustomFields,
  type PaginatedMailboxes
} from '../schema'
import { Transport } from './transport'

/** Client for FreeScout mailbox, folder, and mailbox custom-field operations. */
export class MailboxesClient {
  /**
   * Creates a mailboxes client that issues requests via the given shared transport.
   *
   * @param transport Shared FreeScout HTTP transport.
   */
  public constructor(private readonly transport: Transport) {}

  /**
   * Lists mailboxes.
   *
   * Results are sorted by mailbox ID ascending. Passing `userId` applies FreeScout's access filtering.
   *
   * @param parameters Optional mailbox filters and pagination settings.
   * @returns A paginated mailbox result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async list(parameters?: ListMailboxesParameters): Promise<PaginatedMailboxes> {
    const response = await this.transport.request({
      method: 'GET',
      path: '/mailboxes',
      parameters: ListMailboxesParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedMailboxesSchema)
  }

  /**
   * Lists custom field definitions for a mailbox.
   *
   * This endpoint requires the Custom Fields module in FreeScout.
   *
   * @param mailboxId The FreeScout mailbox ID.
   * @param parameters Optional pagination settings.
   * @returns A paginated custom field definition result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async listCustomFields(
    mailboxId: number,
    parameters?: ListMailboxCustomFieldsParameters
  ): Promise<PaginatedMailboxCustomFields> {
    const response = await this.transport.request({
      method: 'GET',
      path: `/mailboxes/${mailboxId}/custom_fields`,
      parameters: ListMailboxCustomFieldsParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedMailboxCustomFieldsSchema)
  }

  /**
   * Lists folders for a mailbox, with optional owner and folder filtering.
   *
   * @param mailboxId The FreeScout mailbox ID.
   * @param parameters Optional folder filters and pagination settings.
   * @returns A paginated mailbox folder result set.
   * @throws {APIError} When the FreeScout API returns a non-success response.
   */
  public async listFolders(mailboxId: number, parameters?: ListMailboxFoldersParameters): Promise<PaginatedFolders> {
    const response = await this.transport.request({
      method: 'GET',
      path: `/mailboxes/${mailboxId}/folders`,
      parameters: ListMailboxFoldersParametersSchema.parse(parameters ?? {})
    })

    return this.transport.parseJSONResponse(response, PaginatedFoldersSchema)
  }
}
