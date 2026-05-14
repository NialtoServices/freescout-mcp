import { Command } from 'commander'
import { registerServerCommand } from './cli/server'
import { registerStdioCommand } from './cli/stdio'

/**
 * Creates the command-line interface for serving the MCP resource server.
 *
 * @returns Configured CLI command.
 */
function createProgram(): Command {
  const program = new Command()
  program.name('freescout-mcp').description('FreeScout MCP command-line interface')

  registerServerCommand(program)
  registerStdioCommand(program)

  return program
}

try {
  await createProgram().parseAsync(process.argv)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
