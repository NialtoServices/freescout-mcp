import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import {
  ConversationSchema,
  ConversationSortFieldSchema,
  ConversationStatusSchema,
  Client as FreeScoutClient,
  PaginationSchema,
  SortOrderSchema
} from '../../../lib/freescout'
import { parseDateTime, renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'
import { renderParticipant } from './_helpers'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_conversations',
    {
      title: 'List Conversations',
      description:
        'List, filter, and search conversations in the FreeScout instance. Use `subject` for case-insensitive substring search on conversation subjects, and other filters to narrow by mailbox, assignee, customer, status, tag, date range, etc. Note: searching the body/thread content of conversations is not supported by the FreeScout API — subject text is the only searchable free-text field.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        subject: z
          .string()
          .optional()
          .describe(
            'Case-insensitive substring search on conversation subjects (e.g. "billing" matches "Billing question")'
          ),
        mailboxId: z.number().int().min(1).optional().describe('Limit results to a single mailbox (exact match)'),
        folderId: z.number().int().min(1).optional().describe('Limit results to a single mailbox folder (exact match)'),
        status: z.array(ConversationStatusSchema).optional().describe('One or more conversation statuses to include'),
        assignedTo: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            'FreeScout user ID the conversation is assigned to (exact match). Use `whoami` to find your own user ID.'
          ),
        customerId: z.number().int().min(1).optional().describe('Limit results to a single customer (exact match)'),
        customerEmail: z
          .email()
          .optional()
          .describe('Limit results to conversations involving this customer email (exact match)'),
        customerPhone: z
          .string()
          .optional()
          .describe('Substring search against customer phone numbers (digits-only comparison)'),
        number: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Look up a conversation by its visible number (exact match)'),
        tag: z.string().optional().describe('Limit results to conversations carrying this exact tag'),
        createdByUserId: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Limit results to conversations created by this FreeScout user'),
        createdByCustomerId: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Limit results to conversations created by this customer'),
        createdSince: z.iso
          .datetime()
          .optional()
          .describe('Only include conversations created at or after this ISO-8601 timestamp'),
        updatedSince: z.iso
          .datetime()
          .optional()
          .describe('Only include conversations updated at or after this ISO-8601 timestamp'),
        sortField: ConversationSortFieldSchema.optional().describe('Sort field (default: createdAt)'),
        sortOrder: SortOrderSchema.optional().describe('Sort direction (default: desc)'),
        page: z.number().int().min(1).default(1).describe('The page number to fetch'),
        pageSize: z.number().int().min(1).default(20).describe('The number of conversations per page')
      }),
      outputSchema: z.object({ conversations: z.array(ConversationSchema), page: PaginationSchema })
    },
    async (input) => {
      const conversationPage = await client.conversations.list(input)
      const text = renderPaginatedListing({
        heading: 'Conversations',
        pagination: conversationPage.page,
        items: conversationPage._embedded.conversations,
        columns: ['ID', 'Number', 'Subject', 'Status', 'Mailbox', 'Customer', 'Assignee', 'Created At', 'Updated At'],
        renderRow: (conversation) => [
          conversation.id,
          conversation.number,
          conversation.subject,
          conversation.status,
          conversation.mailboxId,
          renderParticipant(conversation.customer),
          renderParticipant(conversation.assignee),
          parseDateTime(conversation.createdAt),
          parseDateTime(conversation.updatedAt)
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { conversations: conversationPage._embedded.conversations, page: conversationPage.page }
      }
    }
  )
}
