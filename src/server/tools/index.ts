import { type McpServer } from '@modelcontextprotocol/server'
import { Client as FreeScoutClient } from '../../lib/freescout'
import { CreateMCPServerOptions } from '../index'
import { registerConversationTools } from './conversations'
import { registerCustomerTools } from './customers'
import { registerMailboxTools } from './mailboxes'
import { registerTagTools } from './tags'
import { registerUserTools } from './users'

/**
 * Registers every MCP tool against `server`.
 *
 * `options` carries transport-injected context (e.g. the per-request identity resolver) and is
 * threaded through to each tool group so write tools can resolve the calling FreeScout user.
 * Read-only tools ignore it.
 */
export function registerTools(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  registerConversationTools(server, client, options)
  registerCustomerTools(server, client, options)
  registerMailboxTools(server, client, options)
  registerTagTools(server, client, options)
  registerUserTools(server, client, options)
}
