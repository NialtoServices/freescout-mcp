import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient, UserSchema } from '../../../lib/freescout'
import { parseDateTime, renderRecord } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, _client: FreeScoutClient, options: CreateMCPServerOptions): void {
  server.registerTool(
    'whoami',
    {
      title: 'Who Am I',
      description: "Returns the FreeScout user identity (ID, name, email) of the caller of this MCP server.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({}),
      outputSchema: z.object({ user: UserSchema })
    },
    async (_input, context) => {
      const user = options.getCurrentUser(context)
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

      const text = renderRecord({
        heading: 'Current User',
        summary: fullName || undefined,
        fields: [
          { label: 'ID', value: user.id },
          { label: 'First Name', value: user.firstName },
          { label: 'Last Name', value: user.lastName },
          { label: 'Email', value: user.email },
          { label: 'Role', value: user.role },
          { label: 'Job Title', value: user.jobTitle },
          { label: 'Timezone', value: user.timezone },
          { label: 'Language', value: user.language },
          { label: 'Created At', value: parseDateTime(user.createdAt) },
          { label: 'Updated At', value: parseDateTime(user.updatedAt) }
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { user }
      }
    }
  )
}
