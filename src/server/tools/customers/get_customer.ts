import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CustomerSchema, Client as FreeScoutClient } from '../../../lib/freescout'
import { parseDateTime, renderRecord } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'get_customer',
    {
      title: 'Get Customer',
      description: 'Fetch a single FreeScout customer by ID, including embedded contact details.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        customerId: z.number().int().min(1).describe('The FreeScout customer ID')
      }),
      outputSchema: z.object({ customer: CustomerSchema })
    },
    async ({ customerId }) => {
      const customer = await client.customers.get(customerId)
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ')

      const text = renderRecord({
        heading: `Customer #${customer.id}`,
        summary: fullName || undefined,
        fields: [
          { label: 'First Name', value: customer.firstName },
          { label: 'Last Name', value: customer.lastName },
          { label: 'Job Title', value: customer.jobTitle },
          { label: 'Company', value: customer.company },
          { label: 'Notes', value: customer.notes },
          { label: 'Created At', value: parseDateTime(customer.createdAt) },
          { label: 'Updated At', value: parseDateTime(customer.updatedAt) }
        ],
        sections: [
          {
            heading: 'Email Addresses',
            columns: ['Value', 'Type'],
            rows: (customer._embedded.emails ?? []).map((entry) => [entry.value, entry.type])
          },
          {
            heading: 'Phone Numbers',
            columns: ['Value', 'Type'],
            rows: (customer._embedded.phones ?? []).map((entry) => [entry.value, entry.type])
          },
          {
            heading: 'Social Profiles',
            columns: ['Type', 'Value'],
            rows: (customer._embedded.social_profiles ?? []).map((entry) => [entry.type, entry.value])
          },
          {
            heading: 'Websites',
            columns: ['Value'],
            rows: (customer._embedded.websites ?? []).map((entry) => [entry.value])
          },
          {
            heading: 'Physical Address',
            columns: ['Field', 'Value'],
            rows: customer._embedded.address
              ? [
                  ['Address', customer._embedded.address.address],
                  ['City', customer._embedded.address.city],
                  ['State', customer._embedded.address.state],
                  ['ZIP', customer._embedded.address.zip],
                  ['Country', customer._embedded.address.country]
                ]
              : []
          }
        ]
      })

      return { content: [{ type: 'text', text }], structuredContent: { customer } }
    }
  )
}
