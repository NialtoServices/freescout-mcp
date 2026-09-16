import { StdioServerTransport } from '@modelcontextprotocol/server'
import { Command, Option } from 'commander'
import { UserResolver } from '../authentication'
import { Client } from '../lib/freescout'
import { createMCPServer } from '../server'

/** Options accepted by the stdio MCP server command. */
interface StdioCommandOptions {
  /**
   * Email address identifying the FreeScout user the server acts as.
   *
   * The email is resolved to a FreeScout user once at startup, and that user is reused for every
   * tool invocation: as the author of notes and drafts, and as `byUser` on updates.
   */
  freescoutUserEmail: string

  /** FreeScout API base URL (e.g. `https://help.example.com/api`). */
  freescoutApiUrl: string

  /** FreeScout API key with sufficient scope for the registered MCP tools. */
  freescoutApiKey: string
}

/**
 * Configures a command to start the stdio MCP server (single-user, JSON-RPC over stdin/stdout).
 *
 * Adds the `--freescout-user-email`, `--freescout-api-url` and `--freescout-api-key` options. All
 * three are mandatory and can be supplied via the matching environment variables.
 *
 * @param command Command to configure, typically the program root.
 */
export function configureStdioCommand(command: Command): void {
  command
    .addOption(
      new Option('--freescout-user-email <email>', 'email address of the calling FreeScout user')
        .env('FREESCOUT_USER_EMAIL')
        .makeOptionMandatory()
    )
    .addOption(
      new Option('--freescout-api-url <url>', 'FreeScout API URL (e.g. https://freescout.example.com/api)')
        .env('FREESCOUT_API_URL')
        .makeOptionMandatory()
    )
    .addOption(
      new Option('--freescout-api-key <key>', 'FreeScout API key').env('FREESCOUT_API_KEY').makeOptionMandatory()
    )
    .action((options: StdioCommandOptions) => runStdioServer(options))
}

async function runStdioServer(options: StdioCommandOptions): Promise<void> {
  const client = new Client({ baseUrl: options.freescoutApiUrl, key: options.freescoutApiKey })
  // Resolve the configured email once at startup. Failing here surfaces a misconfigured CLI flag
  // (e.g. an email with no matching FreeScout account) before the process accepts any tool calls,
  // rather than failing on the first tool invocation.
  const currentUser = await new UserResolver(client).resolve(options.freescoutUserEmail)
  const server = createMCPServer(client, { getCurrentUser: () => currentUser })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
