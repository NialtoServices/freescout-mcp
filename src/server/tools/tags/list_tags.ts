import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, PaginationSchema, TagSchema } from '../../../lib/freescout'
import { renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_tags',
    {
      title: 'List Tags',
      description: 'List FreeScout tags, optionally restricted to a conversation. Requires the Tags module.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Only return tags currently applied to this conversation'),
        page: z.number().int().min(1).default(1).describe('The page number to fetch'),
        pageSize: z.number().int().min(1).default(50).describe('The number of tags per page')
      }),
      outputSchema: z.object({ tags: z.array(TagSchema), page: PaginationSchema })
    },
    async ({ conversationId, page, pageSize }) => {
      const tagPage = await client.tags.list({ conversationId, page, pageSize })
      const text = renderPaginatedListing({
        heading: 'Tags',
        pagination: tagPage.page,
        items: tagPage._embedded.tags,
        columns: ['ID', 'Name', 'Counter', 'Color'],
        renderRow: (tag) => [tag.id, tag.name, tag.counter, tag.color]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { tags: tagPage._embedded.tags, page: tagPage.page }
      }
    }
  )
}
