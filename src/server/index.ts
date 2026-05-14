import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { McpServer, type ServerContext } from '@modelcontextprotocol/server'
import { version } from '../../package.json'
import { type Client, type User } from '../lib/freescout'
import { registerTools } from './tools'

/** Options influencing how the MCP server resolves per-request identity and other context. */
export interface CreateMCPServerOptions {
  /**
   * Returns the FreeScout user associated with the current request.
   *
   * Resolution is performed by the transport entry point before the tool handler runs (HTTP injects
   * the user into the request's `authInfo`; stdio resolves once at startup). Tools that need
   * caller identity (e.g. for `byUser` attribution) can call this synchronously; tools that don't
   * can ignore it.
   *
   * @throws When no resolved user is attached to the request context. This indicates a transport
   *   wiring bug and should never occur in correctly-configured deployments.
   */
  getCurrentUser: (context: ServerContext) => User
}

const INSTRUCTIONS_PATH = fileURLToPath(new URL('../../INSTRUCTIONS.md', import.meta.url))
const INSTRUCTIONS = readFileSync(INSTRUCTIONS_PATH, 'utf8')

/**
 * Builds the MCP server for the given FreeScout client and identity-resolution options.
 *
 * @param client FreeScout API client used by registered tools.
 * @param options Identity resolver and other transport-injected context.
 * @returns Configured MCP server ready to be connected to a transport.
 */
const INSTRUCTIONS_RESOURCE_URI = 'freescout-mcp://instructions'

export function createMCPServer(client: Client, options: CreateMCPServerOptions): McpServer {
  const server = new McpServer({ name: 'freescout-mcp', version }, { instructions: INSTRUCTIONS })

  // Add the instructions as a resource so clients that don't surface the `instructions` field can still discover and
  // pull the same usage guidance.
  server.registerResource(
    'instructions',
    INSTRUCTIONS_RESOURCE_URI,
    {
      title: 'FreeScout MCP Usage Guide',
      description:
        'Server-wide guidance: conversation states, common request patterns, draft/send semantics, deletion constraints, and module-gated tools. Read this before answering questions about FreeScout conversations.',
      mimeType: 'text/markdown'
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: INSTRUCTIONS }] })
  )

  registerTools(server, client, options)
  return server
}
