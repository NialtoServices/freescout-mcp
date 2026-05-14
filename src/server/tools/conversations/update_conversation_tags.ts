import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'update_conversation_tags',
    {
      title: 'Update Conversation Tags',
      description:
        'Replace the full tag set on a FreeScout conversation. Tags omitted from the list are removed; missing tags are created automatically. Requires the Tags module.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID'),
        tags: z.array(z.string().min(1)).describe('Full tag set to apply (replaces existing tags)')
      }),
      outputSchema: z.object({ conversationId: z.number(), tags: z.array(z.string()) })
    },
    async ({ conversationId, tags }) => {
      await client.conversations.replaceTags(conversationId, { tags })
      return {
        content: [
          {
            type: 'text',
            text: `Replaced tags on conversation #${conversationId} with: ${tags.length > 0 ? tags.join(', ') : '_(empty set)_'}.`
          }
        ],
        structuredContent: { conversationId, tags }
      }
    }
  )
}
