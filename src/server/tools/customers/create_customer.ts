import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CustomerSchema, Client as FreeScoutClient } from '../../../lib/freescout'
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
    'create_customer',
    {
      title: 'Create Customer',
      description:
        'Create a new FreeScout customer. At least one of `firstName` or an email must be supplied. If a customer with the same email already exists, creation fails.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: z.object({
        firstName: z.string().optional().describe('Given name'),
        lastName: z.string().optional().describe('Family name'),
        email: z.email().optional().describe('Primary email address (shortcut; mutually exclusive with `emails`)'),
        emails: z.array(emailEntrySchema).optional().describe('Full list of email addresses'),
        phone: z.string().optional().describe('Primary phone number (shortcut; mutually exclusive with `phones`)'),
        phones: z.array(phoneEntrySchema).optional().describe('Full list of phone numbers'),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional().describe('Free-text notes'),
        address: addressInputSchema.optional(),
        socialProfiles: z.array(socialProfileEntrySchema).optional(),
        websites: z.array(websiteEntrySchema).optional()
      }),
      outputSchema: z.object({ customer: CustomerSchema, resourceId: z.number().optional() })
    },
    async (input) => {
      const { resourceId, data: customer } = await client.customers.create(input)
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ')
      return {
        content: [
          {
            type: 'text',
            text: `Created customer #${resourceId ?? customer.id}${fullName ? ` (${fullName})` : ''}.`
          }
        ],
        structuredContent: { customer, resourceId }
      }
    }
  )
}
