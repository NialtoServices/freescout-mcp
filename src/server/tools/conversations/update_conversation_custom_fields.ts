import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'update_conversation_custom_fields',
    {
      title: 'Update Conversation Custom Fields',
      description:
        'Set custom field values on a FreeScout conversation. Only the supplied fields are updated; existing values for those fields are overwritten. Requires the Custom Fields module.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID'),
        customFields: z
          .array(
            z.object({
              id: z.number().int().min(1).describe('Custom field definition ID'),
              value: z.string().describe('New value for the custom field')
            })
          )
          .min(1)
          .describe('Custom field values to update')
      }),
      outputSchema: z.object({ conversationId: z.number(), updatedFieldCount: z.number() })
    },
    async ({ conversationId, customFields }) => {
      await client.conversations.updateCustomFields(conversationId, { customFields })
      return {
        content: [
          {
            type: 'text',
            text: `Updated ${customFields.length} custom field(s) on conversation #${conversationId}.`
          }
        ],
        structuredContent: { conversationId, updatedFieldCount: customFields.length }
      }
    }
  )
}
