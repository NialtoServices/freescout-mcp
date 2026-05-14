import { type McpServer } from '@modelcontextprotocol/server'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'
import { register as registerListMailboxCustomFields } from './list_mailbox_custom_fields'
import { register as registerListMailboxFolders } from './list_mailbox_folders'
import { register as registerListMailboxes } from './list_mailboxes'

/**
 * Registers every mailbox-related MCP tool against `server`.
 *
 * Each individual tool lives in its own file named after the tool it registers (e.g.
 * `./list_mailboxes.ts`, `./list_mailbox_folders.ts`) and exports a `register(server, client,
 * options)` function; this index file glues them together so a single `registerMailboxTools(...)`
 * call brings them all online.
 */
export function registerMailboxTools(
  server: McpServer,
  client: FreeScoutClient,
  options: CreateMCPServerOptions
): void {
  registerListMailboxes(server, client, options)
  registerListMailboxFolders(server, client, options)
  registerListMailboxCustomFields(server, client, options)
}
