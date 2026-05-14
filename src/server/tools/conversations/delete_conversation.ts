import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'delete_conversation',
    {
      title: 'Delete Conversation',
      description:
        'Permanently delete a whole FreeScout conversation, including every thread, note, draft, and attachment it contains. Irreversible.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID to delete permanently')
      }),
      outputSchema: z.object({ conversationId: z.number(), deleted: z.literal(true) })
    },
    async ({ conversationId }) => {
      await client.conversations.delete(conversationId)

      return {
        content: [
          {
            type: 'text',
            text: `Permanently deleted conversation #${conversationId}. This action cannot be reversed through FreeScout's API or web UI.`
          }
        ],
        structuredContent: { conversationId, deleted: true }
      }
    }
  )
}
