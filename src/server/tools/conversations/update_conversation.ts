import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { ConversationStatusSchema, Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  server.registerTool(
    'update_conversation',
    {
      title: 'Update Conversation',
      description:
        'Update a FreeScout conversation: change its status, assignee, mailbox, customer, or subject. Overwrites existing values and is visible in the conversation timeline.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID to update'),
        status: ConversationStatusSchema.optional().describe('New conversation status'),
        assignTo: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('FreeScout user ID to assign the conversation to (use 0 to unassign)'),
        mailboxId: z.number().int().min(1).optional().describe('Move the conversation to this mailbox'),
        customerId: z.number().int().min(1).optional().describe('Reassign the conversation to this customer'),
        subject: z.string().optional().describe('Update the conversation subject')
      }),
      outputSchema: z.object({
        conversationId: z.number(),
        changed: z.object({
          status: ConversationStatusSchema.optional(),
          assignTo: z.number().optional(),
          mailboxId: z.number().optional(),
          customerId: z.number().optional(),
          subject: z.string().optional()
        })
      })
    },
    async ({ conversationId, status, assignTo, mailboxId, customerId, subject }, context) => {
      const currentUser = options.getCurrentUser(context)
      await client.conversations.update(conversationId, {
        byUser: currentUser.id,
        status,
        assignTo,
        mailboxId,
        customerId,
        subject
      })

      const changed = { status, assignTo, mailboxId, customerId, subject }
      const changedList = Object.entries(changed)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')

      return {
        content: [
          {
            type: 'text',
            text: `Updated conversation #${conversationId}.\n\n${changedList || '_(no fields changed)_'}`
          }
        ],
        structuredContent: { conversationId, changed }
      }
    }
  )
}
