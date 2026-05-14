import type {
  AuthInfo,
  CallToolResult,
  JSONRPCMessage,
  ListToolsResult,
  McpServer,
  Tool,
  Transport,
  TransportSendOptions
} from '@modelcontextprotocol/server'

/** A handle to a running in-process MCP loopback connecting a test to an `McpServer`. */
export interface McpLoopback {
  /**
   * Invokes a registered tool by name and returns its `CallToolResult`. Pass `authInfo` to
   * simulate a request that the HTTP transport would have enriched with a resolved FreeScout user.
   */
  callTool(name: string, args: Record<string, unknown>, options?: { authInfo?: AuthInfo }): Promise<CallToolResult>

  /** Lists every tool the server has registered. */
  listTools(): Promise<Tool[]>

  /** Closes the loopback and disconnects the server transport. */
  stop(): Promise<void>
}

/**
 * Wires the supplied `McpServer` to an in-memory JSON-RPC transport and performs the MCP
 * initialize handshake so the returned handle is immediately ready to drive tools.
 *
 * The implementation is a deliberately small JSON-RPC pump — no real `@modelcontextprotocol/client`
 * dependency. Each test request gets a unique numeric id and a pending-promise entry; responses
 * the server sends are dispatched back to the matching entry.
 */
export async function startMcpLoopback(server: McpServer): Promise<McpLoopback> {
  let nextRequestId = 1
  const pending = new Map<number | string, { resolve: (result: unknown) => void; reject: (error: Error) => void }>()

  const transport: Transport = {
    async start() {
      // No-op: the in-process transport has no I/O to initialise.
    },
    async send(message: JSONRPCMessage, _options?: TransportSendOptions) {
      // The server only ever sends JSON-RPC responses in our use case (requests originate from
      // the test side). We look up the matching pending request and resolve or reject it.
      if (!('id' in message) || message.id === undefined || message.id === null) return

      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)

      if ('error' in message) {
        entry.reject(new Error(`MCP error ${message.error.code}: ${message.error.message}`))
      } else if ('result' in message) {
        entry.resolve(message.result)
      }
    },
    async close() {
      pending.clear()
    }
  }

  await server.connect(transport)

  /** Sends a JSON-RPC request to the server and awaits the matching response. */
  function sendRequest<TResult>(
    method: string,
    params: Record<string, unknown>,
    extra?: { authInfo?: AuthInfo }
  ): Promise<TResult> {
    const id = nextRequestId++
    const message: JSONRPCMessage = { jsonrpc: '2.0', id, method, params }

    return new Promise<TResult>((resolve, reject) => {
      pending.set(id, { resolve: (value) => resolve(value as TResult), reject })
      transport.onmessage?.(message, extra)
    })
  }

  /** Sends a JSON-RPC notification (fire-and-forget) to the server. */
  function sendNotification(method: string, params: Record<string, unknown> = {}): void {
    const message: JSONRPCMessage = { jsonrpc: '2.0', method, params }
    transport.onmessage?.(message)
  }

  // Drive the MCP initialize handshake exactly as a real client would.
  await sendRequest('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'mcp-loopback', version: '0.0.0' }
  })
  sendNotification('notifications/initialized')

  return {
    async callTool(name, args, options) {
      return sendRequest<CallToolResult>('tools/call', { name, arguments: args }, options)
    },
    async listTools() {
      const result = await sendRequest<ListToolsResult>('tools/list', {})
      return result.tools
    },
    async stop() {
      await transport.close()
    }
  }
}
