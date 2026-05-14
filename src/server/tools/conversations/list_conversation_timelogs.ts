import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, PaginationSchema, TimelogSchema } from '../../../lib/freescout'
import { parseDateTime, renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_conversation_timelogs',
    {
      title: 'List Conversation Timelogs',
      description: 'List time logs recorded against a FreeScout conversation. Requires the Time Tracking module.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('FreeScout conversation ID'),
        page: z.number().int().min(1).default(1).describe('The page number to fetch'),
        pageSize: z.number().int().min(1).default(20).describe('The number of timelogs per page')
      }),
      outputSchema: z.object({
        conversationId: z.number(),
        timelogs: z.array(TimelogSchema),
        page: PaginationSchema
      })
    },
    async ({ conversationId, page, pageSize }) => {
      const timelogPage = await client.conversations.listTimelogs(conversationId, { page, pageSize })
      const text = renderPaginatedListing({
        heading: `Timelogs for Conversation #${conversationId}`,
        pagination: timelogPage.page,
        items: timelogPage._embedded.timelogs,
        columns: ['ID', 'User ID', 'Status', 'Time Spent (s)', 'Paused', 'Finished', 'Created At', 'Updated At'],
        renderRow: (log) => [
          log.id,
          log.userId,
          log.conversationStatus,
          log.timeSpent,
          log.paused,
          log.finished,
          parseDateTime(log.createdAt),
          parseDateTime(log.updatedAt)
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: {
          conversationId,
          timelogs: timelogPage._embedded.timelogs,
          page: timelogPage.page
        }
      }
    }
  )
}
