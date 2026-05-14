import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, UserSchema } from '../../../lib/freescout'
import { parseDateTime, renderRecord } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'get_user',
    {
      title: 'Get User',
      description: 'Fetch a single FreeScout user by ID.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        userId: z.number().int().min(1).describe('The FreeScout user ID')
      }),
      outputSchema: z.object({ user: UserSchema })
    },
    async ({ userId }) => {
      const user = await client.users.get(userId)
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

      const text = renderRecord({
        heading: `User #${user.id}`,
        summary: fullName || undefined,
        fields: [
          { label: 'First Name', value: user.firstName },
          { label: 'Last Name', value: user.lastName },
          { label: 'Email', value: user.email },
          { label: 'Role', value: user.role },
          { label: 'Alternate Emails', value: user.alternateEmails },
          { label: 'Job Title', value: user.jobTitle },
          { label: 'Phone', value: user.phone },
          { label: 'Timezone', value: user.timezone },
          { label: 'Language', value: user.language },
          { label: 'Photo URL', value: user.photoUrl },
          { label: 'Created At', value: parseDateTime(user.createdAt) },
          { label: 'Updated At', value: parseDateTime(user.updatedAt) }
        ]
      })

      return { content: [{ type: 'text', text }], structuredContent: { user } }
    }
  )
}
