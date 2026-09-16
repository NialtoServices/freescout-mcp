import { Command } from 'commander'
import { configureStdioCommand } from './cli/stdio'

/**
 * Creates the command-line interface that starts the stdio MCP server.
 *
 * @returns Configured CLI command.
 */
function createProgram(): Command {
  const program = new Command()
  program.name('freescout-mcp').description('FreeScout MCP server (single-user, JSON-RPC over stdin/stdout)')

  configureStdioCommand(program)

  return program
}

try {
  await createProgram().parseAsync(process.argv)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
