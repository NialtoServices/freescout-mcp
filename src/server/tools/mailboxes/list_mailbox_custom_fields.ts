import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CustomFieldDefinitionSchema, Client as FreeScoutClient, PaginationSchema } from '../../../lib/freescout'
import { renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_mailbox_custom_fields',
    {
      title: 'List Mailbox Custom Fields',
      description:
        'List the custom field definitions configured for a FreeScout mailbox. Use this before update_conversation_custom_fields to discover valid field IDs and types. Requires the Custom Fields module.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        mailboxId: z.number().int().min(1).describe('The FreeScout mailbox ID'),
        pageSize: z.number().int().min(1).default(50).describe('The number of custom fields per page')
      }),
      outputSchema: z.object({ customFields: z.array(CustomFieldDefinitionSchema), page: PaginationSchema })
    },
    async ({ mailboxId, pageSize }) => {
      const fieldsPage = await client.mailboxes.listCustomFields(mailboxId, { pageSize })
      const text = renderPaginatedListing({
        heading: `Custom Fields for Mailbox #${mailboxId}`,
        pagination: fieldsPage.page,
        items: fieldsPage._embedded.custom_fields,
        columns: ['ID', 'Name', 'Type', 'Required', 'Sort Order', 'Options'],
        renderRow: (field) => [field.id, field.name, field.type, field.required, field.sortOrder, field.options]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { customFields: fieldsPage._embedded.custom_fields, page: fieldsPage.page }
      }
    }
  )
}
