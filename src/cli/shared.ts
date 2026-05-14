import { Command, Option } from 'commander'
import { Client } from '../lib/freescout'

/** CLI options shared by every transport (HTTP, stdio, …) that constructs a FreeScout client. */
export interface FreeScoutClientCommandOptions {
  /** FreeScout API base URL (e.g. `https://help.example.com/api`). */
  freescoutApiUrl: string

  /** FreeScout API key with sufficient scope for the registered MCP tools. */
  freescoutApiKey: string
}

/**
 * Adds the FreeScout-client connection options (`--freescout-api-url`, `--freescout-api-key`) to a
 * subcommand. Both options are mandatory and can be supplied via the matching environment variables.
 *
 * @param command Subcommand to attach the options to.
 * @returns The same command, to allow chaining.
 */
export function addFreeScoutClientOptions(command: Command): Command {
  return command
    .addOption(
      new Option('--freescout-api-url <url>', 'FreeScout API URL (e.g. https://freescout.example.com/api)')
        .env('FREESCOUT_API_URL')
        .makeOptionMandatory()
    )
    .addOption(
      new Option('--freescout-api-key <key>', 'FreeScout API key').env('FREESCOUT_API_KEY').makeOptionMandatory()
    )
}

/**
 * Builds a {@link Client} from the shared CLI options.
 *
 * @param options Parsed subcommand options including the FreeScout connection settings.
 * @returns Configured FreeScout client ready to use with `createMCPServer`.
 */
export function createFreeScoutClient(options: FreeScoutClientCommandOptions): Client {
  return new Client({
    baseUrl: options.freescoutApiUrl,
    key: options.freescoutApiKey
  })
}
