import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, MailboxSchema, PaginationSchema } from '../../../lib/freescout'
import { parseDateTime, renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_mailboxes',
    {
      title: 'List Mailboxes',
      description: 'List all mailboxes in the FreeScout instance.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        page: z.number().min(1).default(1).describe('The page number to fetch'),
        pageSize: z.number().min(1).default(20).describe('The number of mailboxes per page')
      }),
      outputSchema: z.object({ mailboxes: z.array(MailboxSchema), page: PaginationSchema })
    },
    async ({ page, pageSize }) => {
      const mailboxPage = await client.mailboxes.list({ page, pageSize })
      const text = renderPaginatedListing({
        heading: 'Mailboxes',
        pagination: mailboxPage.page,
        items: mailboxPage._embedded.mailboxes,
        columns: ['ID', 'Name', 'Email', 'Created At', 'Updated At'],
        renderRow: (mailbox) => [
          mailbox.id,
          mailbox.name,
          mailbox.email,
          parseDateTime(mailbox.createdAt),
          parseDateTime(mailbox.updatedAt)
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { mailboxes: mailboxPage._embedded.mailboxes, page: mailboxPage.page }
      }
    }
  )
}
