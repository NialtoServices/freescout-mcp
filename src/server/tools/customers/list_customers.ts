import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { CustomerSchema, Client as FreeScoutClient, PaginationSchema } from '../../../lib/freescout'
import { parseDateTime, renderPaginatedListing } from '../../helpers'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'list_customers',
    {
      title: 'List Customers',
      description: 'List all customers in the FreeScout instance.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        email: z.email().optional().describe('Find a customer by their email address'),
        page: z.number().min(1).default(1).describe('The page number to fetch'),
        pageSize: z.number().min(1).default(20).describe('The number of customers per page')
      }),
      outputSchema: z.object({ customers: z.array(CustomerSchema), page: PaginationSchema })
    },
    async ({ email, page, pageSize }) => {
      const customerPage = await client.customers.list({ email, page, pageSize })
      const text = renderPaginatedListing({
        heading: 'Customers',
        pagination: customerPage.page,
        items: customerPage._embedded.customers,
        columns: [
          'ID',
          'Name',
          'Job Title',
          'Company',
          'Email Addresses',
          'Phone Numbers',
          'Social Profiles',
          'Websites',
          'Physical Address',
          'Created At',
          'Updated At'
        ],
        renderRow: (customer) => [
          customer.id,
          [customer.firstName, customer.lastName].filter(Boolean).join(' '),
          customer.jobTitle,
          customer.company,
          (customer._embedded.emails ?? []).map((entry) => entry.value),
          (customer._embedded.phones ?? []).map((entry) => entry.value),
          (customer._embedded.social_profiles ?? []).map((entry) => `${entry.type}: ${entry.value}`),
          (customer._embedded.websites ?? []).map((entry) => entry.value),
          [
            customer._embedded.address?.address,
            customer._embedded.address?.city,
            customer._embedded.address?.state,
            customer._embedded.address?.zip,
            customer._embedded.address?.country
          ].filter(Boolean),
          parseDateTime(customer.createdAt),
          parseDateTime(customer.updatedAt)
        ]
      })

      return {
        content: [{ type: 'text', text }],
        structuredContent: { customers: customerPage._embedded.customers, page: customerPage.page }
      }
    }
  )
}
