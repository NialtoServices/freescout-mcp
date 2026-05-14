import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, ThreadSchema } from '../../../lib/freescout'
import { plaintextToHtml } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  server.registerTool(
    'add_conversation_note',
    {
      title: 'Add Conversation Note',
      description:
        'Add an internal note to a FreeScout conversation. Notes are visible to agents only and are never emailed to the customer. The note cannot be edited or deleted via this tool.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID to add the note to'),
        text: z.string().min(1).describe('Note body (plain text; converted to HTML before sending)')
      }),
      outputSchema: z.object({ conversationId: z.number(), thread: ThreadSchema })
    },
    async ({ conversationId, text }, context) => {
      const currentUser = options.getCurrentUser(context)
      const { data: thread } = await client.conversations.createThread(conversationId, {
        type: 'note',
        text: plaintextToHtml(text),
        user: currentUser.id
      })

      return {
        content: [
          {
            type: 'text',
            text: [
              `Added internal note to conversation #${conversationId} (thread id ${thread.id}).`,
              `Authored as: ${currentUser.firstName} ${currentUser.lastName} <${currentUser.email}>.`
            ].join('\n')
          }
        ],
        structuredContent: { conversationId, thread }
      }
    }
  )
}
