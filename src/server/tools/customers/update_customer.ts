import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'
import {
  addressInputSchema,
  emailEntrySchema,
  phoneEntrySchema,
  socialProfileEntrySchema,
  websiteEntrySchema
} from './_helpers'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'update_customer',
    {
      title: 'Update Customer',
      description:
        'Update a FreeScout customer. Supplied fields overwrite existing values. Use `emails` to replace the entire email set, or `emailsAdd` to append without removing existing entries.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        customerId: z.number().int().min(1).describe('The FreeScout customer ID'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
        address: addressInputSchema.optional(),
        emails: z.array(emailEntrySchema).optional().describe('Full replacement of the email set'),
        emailsAdd: z.array(emailEntrySchema).optional().describe('Append-only addition of emails (preserves existing)'),
        phones: z.array(phoneEntrySchema).optional().describe('Full replacement of the phone set'),
        socialProfiles: z.array(socialProfileEntrySchema).optional(),
        websites: z.array(websiteEntrySchema).optional()
      }),
      outputSchema: z.object({ customerId: z.number(), fieldsChanged: z.array(z.string()) })
    },
    async ({ customerId, ...body }) => {
      await client.customers.update(customerId, body)
      const fieldsChanged = Object.keys(body).filter((key) => body[key as keyof typeof body] !== undefined)
      return {
        content: [
          {
            type: 'text',
            text: `Updated customer #${customerId}.${fieldsChanged.length > 0 ? ` Fields changed: ${fieldsChanged.join(', ')}.` : ''}`
          }
        ],
        structuredContent: { customerId, fieldsChanged }
      }
    }
  )
}
