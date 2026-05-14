import { type McpServer } from '@modelcontextprotocol/server'
import { Client as FreeScoutClient } from '../../../lib/freescout'
import { CreateMCPServerOptions } from '../../index'
import { register as registerGetUser } from './get_user'
import { register as registerListUsers } from './list_users'
import { register as registerWhoami } from './whoami'

/**
 * Registers every user-related MCP tool against `server`.
 *
 * Each individual tool lives in its own file named after the tool it registers (e.g.
 * `./list_users.ts`, `./whoami.ts`) and exports a `register(server, client, options)` function;
 * this index file glues them together so a single `registerUserTools(...)` call brings them all
 * online.
 */
export function registerUserTools(server: McpServer, client: FreeScoutClient, options: CreateMCPServerOptions): void {
  registerWhoami(server, client, options)
  registerListUsers(server, client, options)
  registerGetUser(server, client, options)
}
