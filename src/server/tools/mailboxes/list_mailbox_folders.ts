import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { FolderSchema, Client as FreeScoutClient, PaginationSchema } from '../../../lib/freescout'
import { renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_mailbox_folders',
    {
      title: 'List Mailbox Folders',
      description: 'List the folders within a FreeScout mailbox, optionally filtered by owner.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        mailboxId: z.number().int().min(1).describe('The FreeScout mailbox ID'),
        userId: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Limit results to folders owned by this user (e.g. "Mine" folder)'),
        folderId: z.number().int().min(1).optional().describe('Fetch a single folder by ID'),
        pageSize: z.number().int().min(1).default(50).describe('The number of folders per page')
      }),
      outputSchema: z.object({ folders: z.array(FolderSchema), page: PaginationSchema })
    },
    async ({ mailboxId, userId, folderId, pageSize }) => {
      const folderPage = await client.mailboxes.listFolders(mailboxId, { userId, folderId, pageSize })
      const text = renderPaginatedListing({
        heading: `Folders for Mailbox #${mailboxId}`,
        pagination: folderPage.page,
        items: folderPage._embedded.folders,
        columns: ['ID', 'Name', 'Type', 'Owner User ID', 'Total Count', 'Active Count'],
        renderRow: (folder) => [
          folder.id,
          folder.name,
          folder.type,
          folder.userId,
          folder.totalCount,
          folder.activeCount
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { folders: folderPage._embedded.folders, page: folderPage.page }
      }
    }
  )
}
