import { type McpServer } from '@modelcontextprotocol/server'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'
import { register as registerCreateCustomer } from './create_customer'
import { register as registerGetCustomer } from './get_customer'
import { register as registerListCustomers } from './list_customers'
import { register as registerUpdateCustomer } from './update_customer'
import { register as registerUpdateCustomerFields } from './update_customer_fields'

/**
 * Registers every customer-related MCP tool against `server`.
 *
 * Each individual tool lives in its own file named after the tool it registers (e.g.
 * `./list_customers.ts`, `./create_customer.ts`) and exports a `register(server, client, options)`
 * function; this index file glues them together so a single `registerCustomerTools(...)` call
 * brings them all online.
 */
export function registerCustomerTools(
  server: McpServer,
  client: FreeScoutClient,
  options: CreateMCPServerOptions
): void {
  registerListCustomers(server, client, options)
  registerGetCustomer(server, client, options)
  registerCreateCustomer(server, client, options)
  registerUpdateCustomer(server, client, options)
  registerUpdateCustomerFields(server, client, options)
}
