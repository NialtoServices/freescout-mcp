# freescout-mcp

A Model Context Protocol (MCP) server that exposes the [FreeScout](https://freescout.net) helpdesk API to MCP-aware AI assistants. It speaks JSON-RPC over stdin/stdout and acts as a single FreeScout user, so an MCP client launches it locally with `npx`.

## Capabilities

The server exposes 22 tools across five resource groups:

| Group | Tools |
|---|---|
| Conversations | `list_conversations`, `get_conversation`, `create_conversation`, `add_conversation_note`, `draft_conversation_reply`, `update_conversation`, `update_conversation_tags`, `update_conversation_custom_fields`, `list_conversation_timelogs`, `delete_conversation` |
| Customers | `list_customers`, `get_customer`, `create_customer`, `update_customer`, `update_customer_fields` |
| Mailboxes | `list_mailboxes`, `list_mailbox_folders`, `list_mailbox_custom_fields` |
| Tags | `list_tags` |
| Users | `list_users`, `get_user`, `whoami` |

Every tool returns both human-readable markdown and a typed `structuredContent` payload validated by a Zod schema.

Cross-cutting guidance for the AI — conversation states, common request patterns, draft/send semantics, deletion constraints — lives in [INSTRUCTIONS.md](INSTRUCTIONS.md) and is surfaced to the MCP client as the server's `instructions` field.

### Safety properties

- **No mail is sent.** `create_conversation` and `draft_conversation_reply` always save drafts. A human must publish them in FreeScout's web UI.
- **Deletion is conversation-scoped only.** `delete_conversation` is marked `destructiveHint: true`. There is no API for deleting individual threads, drafts, or notes.

## Quick start

Requires Node.js 20 or later on the machine running the MCP client.

### Claude Desktop

```json
{
  "mcpServers": {
    "freescout": {
      "command": "npx",
      "args": ["-y", "@nialtoservices/freescout-mcp"],
      "env": {
        "FREESCOUT_API_URL": "https://freescout.example.com/api",
        "FREESCOUT_API_KEY": "...",
        "FREESCOUT_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add freescout \
  --env FREESCOUT_API_URL=https://freescout.example.com/api \
  --env FREESCOUT_API_KEY=... \
  --env FREESCOUT_USER_EMAIL=you@example.com \
  -- npx -y @nialtoservices/freescout-mcp
```

## Configuration

All three settings are required. Each can be passed as a flag or through its environment variable.

| Flag | Env | Purpose |
|---|---|---|
| `--freescout-api-url` | `FREESCOUT_API_URL` | FreeScout API base URL, ending in `/api`. |
| `--freescout-api-key` | `FREESCOUT_API_KEY` | FreeScout API key. |
| `--freescout-user-email` | `FREESCOUT_USER_EMAIL` | Email address of the FreeScout user the server acts as. |

## Acting user

FreeScout's API itself only exposes a single instance-wide API key with no per-user identity. To attribute writes (notes, drafts, status changes) to a real person, the server looks `FREESCOUT_USER_EMAIL` up against `GET /api/users` once at startup, and exits with an error if no FreeScout user matches.

Every tool invocation uses that resolved user. Tools that author content (`create_conversation`, `add_conversation_note`, `draft_conversation_reply`) attach it as the author; `update_conversation` forwards it as `byUser` so the timeline records who did what.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test                # vitest, no mocks (HTTP fixture-server + in-process MCP loopback)
npm run typecheck       # tsc
npm run build           # esbuild → dist/freescout-mcp.js
npm run cli -- --help   # build, then run the bundled server
npm run format          # prettier
```

Tests use a real in-process HTTP fixture-server for FreeScout API interactions and a paired in-process MCP transport (`src/test/mcp-loopback.ts`) for end-to-end tool calls — no mocks.

The build is a single esbuild bundle because the source's extension-less and directory imports don't resolve under Node's ESM loader. `INSTRUCTIONS.md` is inlined into the bundle as text.

### Publishing

```bash
npm publish
```

`prepublishOnly` runs the type check, the tests and the build first, so the published bundle always comes from a passing tree.

## License

MIT. See [LICENSE](LICENSE).
