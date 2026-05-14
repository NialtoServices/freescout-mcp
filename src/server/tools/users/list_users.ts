import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, PaginationSchema, UserSchema } from '../../../lib/freescout'
import { parseDateTime, renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_users',
    {
      title: 'List Users',
      description: 'List all users in the FreeScout instance.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        email: z.email().optional().describe('Find a user by their email address'),
        page: z.number().min(1).default(1).describe('The page number to fetch'),
        pageSize: z.number().min(1).default(20).describe('The number of users per page')
      }),
      outputSchema: z.object({ users: z.array(UserSchema), page: PaginationSchema })
    },
    async ({ email, page, pageSize }) => {
      const userPage = await client.users.list({ email, page, pageSize })
      const text = renderPaginatedListing({
        heading: 'Users',
        pagination: userPage.page,
        items: userPage._embedded.users,
        columns: [
          'ID',
          'Name',
          'Role',
          'Email',
          'Phone',
          'Job Title',
          'Timezone',
          'Language',
          'Created At',
          'Updated At'
        ],
        renderRow: (user) => [
          user.id,
          [user.firstName, user.lastName].filter(Boolean).join(' '),
          user.role,
          user.email,
          user.phone,
          user.jobTitle,
          user.timezone,
          user.language,
          parseDateTime(user.createdAt),
          parseDateTime(user.updatedAt)
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { users: userPage._embedded.users, page: userPage.page }
      }
    }
  )
}
