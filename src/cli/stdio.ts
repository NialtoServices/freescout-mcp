import { StdioServerTransport } from '@modelcontextprotocol/server'
import { Command, Option } from 'commander'
import { UserResolver } from '../authentication'
import { createMCPServer } from '../server'
import { addFreeScoutClientOptions, createFreeScoutClient, FreeScoutClientCommandOptions } from './shared'

/** Options for the `stdio` command. */
interface StdioCommandOptions extends FreeScoutClientCommandOptions {
  /**
   * Email address identifying the calling FreeScout user.
   *
   * Stdio is a single-user transport: there is no per-request authentication context, so the email
   * is supplied once at process startup and reused for every tool invocation. Write tools that need
   * to populate `byUser` attribution against FreeScout will resolve this email to a FreeScout user.
   */
  freescoutUserEmail: string
}

/**
 * Registers the stdio MCP server command.
 *
 * @param program Parent command.
 */
export function registerStdioCommand(program: Command): void {
  const command = program
    .command('stdio')
    .description('Start the stdio MCP server (single-user, JSON-RPC over stdin/stdout)')
    .addOption(
      new Option('--freescout-user-email <email>', 'email address of the calling FreeScout user')
        .env('FREESCOUT_USER_EMAIL')
        .makeOptionMandatory()
    )

  addFreeScoutClientOptions(command).action((options: StdioCommandOptions) => runStdioServer(options))
}

async function runStdioServer(options: StdioCommandOptions): Promise<void> {
  const client = createFreeScoutClient(options)
  // Resolve the configured email once at startup. Failing here surfaces a misconfigured CLI flag
  // (e.g. an email with no matching FreeScout account) before the process accepts any tool calls,
  // rather than failing on the first tool invocation.
  const currentUser = await new UserResolver(client).resolve(options.freescoutUserEmail)
  const server = createMCPServer(client, { getCurrentUser: () => currentUser })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
