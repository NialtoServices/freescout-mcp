import { type McpServer } from '@modelcontextprotocol/server'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'
import { register as registerListTags } from './list_tags'

/**
 * Registers every tag-related MCP tool against `server`.
 *
 * Each individual tool lives in its own file named after the tool it registers (e.g.
 * `./list_tags.ts`) and exports a `register(server, client, options)` function; this index file
 * glues them together so a single `registerTagTools(...)` call brings them all online.
 */
export function registerTagTools(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  registerListTags(server, client, options)
}
