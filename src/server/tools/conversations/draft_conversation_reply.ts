import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, ThreadSchema } from '../../../lib/freescout'
import { plaintextToHtml } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  server.registerTool(
    'draft_conversation_reply',
    {
      title: 'Draft Conversation Reply',
      description:
        'Create a draft customer-facing reply on a FreeScout conversation. Saved as a draft for human review; does not send email.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID to draft a reply on'),
        text: z.string().min(1).describe('Reply body (plain text; converted to HTML before saving)')
      }),
      outputSchema: z.object({ conversationId: z.number(), thread: ThreadSchema, state: z.literal('draft') })
    },
    async ({ conversationId, text }, context) => {
      const currentUser = options.getCurrentUser(context)
      const { data: thread } = await client.conversations.createThread(conversationId, {
        type: 'message',
        text: plaintextToHtml(text),
        user: currentUser.id,
        state: 'draft'
      })

      return {
        content: [
          {
            type: 'text',
            text: [
              `Drafted reply on conversation #${conversationId} (thread id ${thread.id}, state: draft).`,
              `Authored as: ${currentUser.firstName} ${currentUser.lastName} <${currentUser.email}>.`,
              '',
              'This draft is **not sent**. A human must review and publish it in FreeScout.'
            ].join('\n')
          }
        ],
        structuredContent: { conversationId, thread, state: 'draft' }
      }
    }
  )
}
