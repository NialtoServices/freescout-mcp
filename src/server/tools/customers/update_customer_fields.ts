import { type McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'

export function register(server: McpServer, client: FreeScoutClient, _options: CreateMCPServerOptions): void {
  server.registerTool(
    'update_customer_fields',
    {
      title: 'Update Customer Fields',
      description:
        'Set custom field values on a FreeScout customer. Only the supplied fields are updated; existing values for those fields are overwritten. Requires the CRM module.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: z.object({
        customerId: z.number().int().min(1).describe('The FreeScout customer ID'),
        customerFields: z
          .array(
            z.object({
              id: z.number().int().min(1).describe('Customer field definition ID'),
              value: z.string().describe('New value for the field')
            })
          )
          .min(1)
          .describe('Customer field values to update')
      }),
      outputSchema: z.object({ customerId: z.number(), updatedFieldCount: z.number() })
    },
    async ({ customerId, customerFields }) => {
      await client.customers.updateFields(customerId, { customerFields })
      return {
        content: [
          {
            type: 'text',
            text: `Updated ${customerFields.length} custom field(s) on customer #${customerId}.`
          }
        ],
        structuredContent: { customerId, updatedFieldCount: customerFields.length }
      }
    }
  )
}
