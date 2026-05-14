import { serve } from '@hono/node-server'
import { createMcpHonoApp } from '@modelcontextprotocol/hono'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server'
import { Command, Option } from 'commander'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import {
  createBearerRequestHandler,
  createOAuthConfiguration,
  createProtectedResourceMetadata,
  OAUTH_PROTECTED_RESOURCE_METADATA_MCP_PATH,
  OAUTH_PROTECTED_RESOURCE_METADATA_PATH,
  OAuthBearerTokenVerifier,
  readUserFromContext,
  UserResolver
} from '../authentication'
import { createMCPServer } from '../server'
import { addFreeScoutClientOptions, createFreeScoutClient, FreeScoutClientCommandOptions } from './shared'

/** Options for the `serve` command. */
interface ServeCommandOptions extends FreeScoutClientCommandOptions {
  /** Host address to bind the HTTP server to. */
  host: string

  /** Port to listen on for HTTP requests. */
  port: number

  /** Public base URL of this server (e.g. `https://mcp.example.com`). */
  publicUrl: string

  /** Issuer URL of the upstream OAuth authorization server. */
  oauthIssuer: string

  /** JWKS endpoint of the upstream OAuth authorization server. */
  oauthJwksUrl: string

  /** Audience value required in incoming access tokens. */
  oauthAudience: string
}

/**
 * Registers the HTTP server command.
 *
 * @param program Parent command.
 */
export function registerServerCommand(program: Command): void {
  const command = program
    .command('serve')
    .description('Start the HTTP MCP server')
    .addOption(new Option('--host <host>', 'HTTP host').env('HOST').default('0.0.0.0'))
    .addOption(
      new Option('--port <port>', 'HTTP port')
        .env('PORT')
        .default(8080)
        .argParser((value) => {
          const port = Number.parseInt(value, 10)
          if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('Port must be an integer between 1 and 65535')
          }
          return port
        })
    )
    .addOption(
      new Option('--public-url <url>', 'public base URL of this server (e.g. https://mcp.example.com)')
        .env('PUBLIC_URL')
        .makeOptionMandatory()
    )
    .addOption(
      new Option('--oauth-audience <aud>', 'audience required in incoming access tokens')
        .env('OAUTH_AUDIENCE')
        .makeOptionMandatory()
    )
    .addOption(
      new Option('--oauth-issuer <url>', 'issuer URL of the upstream OAuth authorization server')
        .env('OAUTH_ISSUER')
        .makeOptionMandatory()
    )
    .addOption(
      new Option('--oauth-jwks-url <url>', 'JWKS endpoint of the upstream OAuth authorization server')
        .env('OAUTH_JWKS_URL')
        .makeOptionMandatory()
    )

  addFreeScoutClientOptions(command).action((options: ServeCommandOptions) => serveApplication(options))
}

async function serveApplication(options: ServeCommandOptions): Promise<void> {
  const oauthConfiguration = createOAuthConfiguration(
    options.publicUrl,
    options.oauthJwksUrl,
    options.oauthIssuer,
    options.oauthAudience
  )

  const oauthBearerTokenVerifier = new OAuthBearerTokenVerifier(oauthConfiguration)

  const client = createFreeScoutClient(options)
  const userResolver = new UserResolver(client)

  // The HTTP transport resolves the user once per request and stores it on `authInfo.extra.user`,
  // so `getCurrentUser` is a synchronous lookup against the already-resolved value.
  const server = createMCPServer(client, { getCurrentUser: readUserFromContext })

  const serverTransport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(serverTransport)

  // Restrict accepted `Host` headers to the public URL the server advertises. This silences the SDK's DNS-rebinding
  // warning when binding to 0.0.0.0 and turns the recommendation into a real check rather than relying on OAuth as the
  // sole mitigation.
  const application = createMcpHonoApp({
    host: options.host,
    allowedHosts: [oauthConfiguration.baseUrl.hostname]
  })

  application.use('*', logger())

  // CORS is intentionally open (`origin: '*'`) on both the OAuth metadata endpoints and the MCP endpoint.
  // The metadata is public per RFC 9728; the MCP endpoint is gated by the OAuth bearer token required in the
  // `Authorization` header, which is not a CORS credential and therefore not subject to same-origin
  // cookie-style forgery. Browser-based MCP clients hosted on arbitrary origins are the intended consumer.
  application.use(
    '/.well-known/*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type']
    })
  )

  application.use(
    '/mcp',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type', 'Mcp-Session-Id', 'Mcp-Protocol-Version'],
      exposeHeaders: ['Mcp-Session-Id']
    })
  )

  application.get('/', (context) => context.text('Please configure your MCP client to use the /mcp endpoint.'))

  application.get(OAUTH_PROTECTED_RESOURCE_METADATA_PATH, (context) =>
    context.json(createProtectedResourceMetadata(oauthConfiguration))
  )

  application.get(OAUTH_PROTECTED_RESOURCE_METADATA_MCP_PATH, (context) =>
    context.json(createProtectedResourceMetadata(oauthConfiguration))
  )

  const mcpHandler = createBearerRequestHandler({
    verifier: oauthBearerTokenVerifier,
    userResolver,
    protectedResourceMetadataMcpUrl: oauthConfiguration.protectedResourceMetadataMcpUrl,
    handleRequest: (request, extras) => serverTransport.handleRequest(request, extras)
  })

  application.all('/mcp', (context) => mcpHandler(context.req.raw))

  await new Promise<void>((resolve, reject) => {
    const httpServer = serve({ fetch: application.fetch, hostname: options.host, port: options.port }, (serverInfo) => {
      console.error(`Server is running on http://${serverInfo.address}:${serverInfo.port}`)
      resolve()
    })

    httpServer.on('error', reject)
  })
}
