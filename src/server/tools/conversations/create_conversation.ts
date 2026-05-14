import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { ConversationSchema, ConversationTypeSchema, Client as FreeScoutClient } from '../../../lib/freescout'
import { plaintextToHtml } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  server.registerTool(
    'create_conversation',
    {
      title: 'Create Conversation',
      description:
        'Create a new outbound conversation with a customer, seeded with a draft initial message for human review. The draft is **not sent** — a human must publish it in FreeScout to actually email the customer. The draft cannot be edited or deleted through this tool; if you create one in error, mention this clearly so the human knows to discard it.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: z.object({
        mailboxId: z.number().int().min(1).describe('FreeScout mailbox ID to create the conversation in'),
        subject: z.string().min(1).describe('Conversation subject'),
        customerEmail: z
          .email()
          .describe(
            'Email address of the customer to associate with the conversation. FreeScout creates the customer if no match exists.'
          ),
        text: z.string().min(1).describe('Initial draft message body (plain text; converted to HTML before saving)'),
        type: ConversationTypeSchema.default('email').describe('Conversation type (defaults to email)')
      }),
      outputSchema: z.object({ conversation: ConversationSchema, resourceId: z.number().optional() })
    },
    async ({ mailboxId, subject, customerEmail, text, type }, context) => {
      const currentUser = options.getCurrentUser(context)
      const { resourceId, data: conversation } = await client.conversations.create({
        type,
        mailboxId,
        subject,
        customer: { email: customerEmail },
        threads: [
          {
            type: 'message',
            text: plaintextToHtml(text),
            user: currentUser.id,
            state: 'draft'
          }
        ]
      })

      return {
        content: [
          {
            type: 'text',
            text: [
              `Created conversation #${conversation.number} (id ${resourceId ?? conversation.id}) in mailbox #${mailboxId}.`,
              `Customer: ${customerEmail}`,
              `Authored as: ${currentUser.firstName} ${currentUser.lastName} <${currentUser.email}>.`,
              '',
              'The initial message is saved as a **draft** and **not sent**. A human must review and publish it in FreeScout.'
            ].join('\n')
          }
        ],
        structuredContent: { conversation, resourceId }
      }
    }
  )
}
