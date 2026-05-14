import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { ConversationEmbedSchema, ConversationSchema, Client as FreeScoutClient } from '../../../lib/freescout'
import { parseDateTime, renderRecord } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'
import { renderParticipant, renderThread } from './_helpers'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'get_conversation',
    {
      title: 'Get Conversation',
      description:
        'Fetch a single FreeScout conversation by ID. Includes threads by default; pass `embed` to override.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        conversationId: z.number().int().min(1).describe('The FreeScout conversation ID'),
        embed: z
          .array(ConversationEmbedSchema)
          .optional()
          .describe('Which embedded collections to include (defaults to threads only)')
      }),
      outputSchema: z.object({ conversation: ConversationSchema })
    },
    async ({ conversationId, embed }) => {
      const conversation = await client.conversations.get(conversationId, embed ? { embed } : undefined)
      const threads = conversation._embedded?.threads ?? []
      const timelogs = conversation._embedded?.timelogs ?? []
      const tags = conversation._embedded?.tags ?? []

      const sections = []
      if (threads.length > 0) {
        sections.push({
          heading: 'Threads',
          columns: ['ID', 'Type', 'State', 'Created At', 'Created By', 'Body Preview'],
          rows: threads.map((thread) => [
            thread.id,
            thread.type,
            thread.state,
            parseDateTime(thread.createdAt),
            renderParticipant(thread.createdBy),
            (thread.body ?? '').replace(/<[^>]+>/g, '').slice(0, 80)
          ])
        })
      }
      if (tags.length > 0) {
        sections.push({
          heading: 'Tags',
          columns: ['ID', 'Name'],
          rows: tags.map((tag) => [tag.id, tag.name])
        })
      }
      if (timelogs.length > 0) {
        sections.push({
          heading: 'Time Logs',
          columns: ['ID', 'User ID', 'Time Spent (s)', 'Paused', 'Finished', 'Created At'],
          rows: timelogs.map((log) => [
            log.id,
            log.userId,
            log.timeSpent,
            log.paused,
            log.finished,
            parseDateTime(log.createdAt)
          ])
        })
      }

      const text = renderRecord({
        heading: `Conversation #${conversation.number} (id ${conversation.id})`,
        summary: conversation.subject ?? undefined,
        fields: [
          { label: 'Status', value: conversation.status },
          { label: 'State', value: conversation.state },
          { label: 'Type', value: conversation.type },
          { label: 'Mailbox ID', value: conversation.mailboxId },
          { label: 'Folder ID', value: conversation.folderId },
          { label: 'Customer', value: renderParticipant(conversation.customer) },
          { label: 'Assignee', value: renderParticipant(conversation.assignee) },
          { label: 'Created At', value: parseDateTime(conversation.createdAt) },
          { label: 'Updated At', value: parseDateTime(conversation.updatedAt) },
          { label: 'Closed At', value: parseDateTime(conversation.closedAt) },
          { label: 'Thread Count', value: conversation.threadsCount }
        ],
        sections
      })

      const threadBlocks = threads.map(renderThread).join('\n\n')
      const fullText = threads.length > 0 ? `${text}\n\n## Thread Bodies\n\n${threadBlocks}` : text

      return { content: [{ type: 'text', text: fullText }], structuredContent: { conversation } }
    }
  )
}
