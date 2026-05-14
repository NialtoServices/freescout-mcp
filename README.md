# freescout-mcp

A Model Context Protocol (MCP) server that exposes the [FreeScout](https://freescout.net) helpdesk API to MCP-aware AI assistants. It ships two transports:

- **`serve`** — HTTP transport with OAuth bearer-token authentication. Each request is verified against an upstream authorization server, the bearer's email is resolved to a FreeScout user, and that identity is attached to the request before any tool runs. Suitable for multi-user, multi-tenant deployments.
- **`stdio`** — JSON-RPC over stdin/stdout. The FreeScout user is supplied once at startup via `--freescout-user-email`. Suitable for single-user local clients such as Claude Desktop.

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
- **All `/mcp` requests require a verified OAuth bearer token.** Public routes are limited to protected-resource metadata.

## Quick start

### Docker (HTTP transport)

```bash
docker run -p 8080:8080 \
  -e PUBLIC_URL=https://mcp.example.com \
  -e OAUTH_AUDIENCE=https://mcp.example.com \
  -e OAUTH_ISSUER=https://auth.example.com \
  -e OAUTH_JWKS_URL=https://auth.example.com/.well-known/jwks.json \
  -e FREESCOUT_API_URL=https://freescout.example.com/api \
  -e FREESCOUT_API_KEY=... \
  ghcr.io/nialtoservices/freescout-mcp:latest
```

The container is published as `ghcr.io/nialtoservices/freescout-mcp` for `linux/amd64` and `linux/arm64`.

### Stdio (single-user local client)

Example Claude Desktop entry:

```json
{
  "mcpServers": {
    "freescout": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "FREESCOUT_USER_EMAIL=you@example.com",
        "-e", "FREESCOUT_API_URL=https://freescout.example.com/api",
        "-e", "FREESCOUT_API_KEY=...",
        "ghcr.io/nialtoservices/freescout-mcp:latest",
        "stdio"
      ]
    }
  }
}
```

Or, from a checkout:

```bash
npm install
node --import tsx src/index.ts stdio \
  --freescout-user-email you@example.com \
  --freescout-api-url https://freescout.example.com/api \
  --freescout-api-key ...
```

## Configuration

### `serve` (HTTP)

| Flag | Env | Purpose |
|---|---|---|
| `--host` | `HOST` | Bind host. Defaults to `0.0.0.0`. |
| `--port` | `PORT` | Bind port. Defaults to `8080`. |
| `--public-url` | `PUBLIC_URL` | Public base URL of this server (used in OAuth metadata and DNS-rebinding allowlist). |
| `--oauth-audience` | `OAUTH_AUDIENCE` | Audience claim required in incoming access tokens. |
| `--oauth-issuer` | `OAUTH_ISSUER` | Issuer URL of the upstream authorization server. |
| `--oauth-jwks-url` | `OAUTH_JWKS_URL` | JWKS endpoint of the upstream authorization server. |
| `--freescout-api-url` | `FREESCOUT_API_URL` | FreeScout API base URL. |
| `--freescout-api-key` | `FREESCOUT_API_KEY` | FreeScout API key. |

### `stdio`

| Flag | Env | Purpose |
|---|---|---|
| `--freescout-user-email` | `FREESCOUT_USER_EMAIL` | Email address of the calling FreeScout user. Resolved once at startup. |
| `--freescout-api-url` | `FREESCOUT_API_URL` | FreeScout API base URL. |
| `--freescout-api-key` | `FREESCOUT_API_KEY` | FreeScout API key. |

## Authentication model

FreeScout's API itself only exposes a single instance-wide API key with no per-user identity. To attribute writes (notes, drafts, status changes) to a real person, this server resolves a FreeScout user out-of-band:

- **HTTP** — the OAuth access token's `email` claim is looked up against `GET /api/users` and the result is cached for 60 seconds. A failure at any step returns RFC 6750 `401 invalid_token`.
- **stdio** — `--freescout-user-email` is resolved once at process startup.

The resolved user is injected into the tool's request context. Tools that author content (`create_conversation`, `add_conversation_note`, `draft_conversation_reply`) attach it as the author; `update_conversation` forwards it as `byUser` so the timeline records who did what.

## Authorization server requirements

The HTTP transport delegates user authentication entirely to an upstream OAuth 2.1 / OIDC authorization server. Any AS that satisfies the following will work; a worked Keycloak example is in the [appendix](#appendix-keycloak-as-the-authorization-server).

**Required of the AS:**

- **OIDC discovery** at a stable issuer URL, including a `jwks_uri` for verifying RS256-signed access tokens.
- **Dynamic Client Registration (RFC 7591)** so MCP clients (Claude Desktop, Cursor, MCP Inspector, etc.) can register themselves without manual setup.
- **Audience binding** — tokens minted for the MCP server must carry `aud = <PUBLIC_URL>`. The MCP server rejects any token whose audience doesn't match.
- **An `email` claim and `email_verified: true`** on the access token. The server uses `email` to look up the FreeScout user.

**Recommended:**

- **`offline_access`** as a granted scope. Without it, the client's refresh token dies when the AS's SSO session idles out and users must re-authenticate. With it, users typically log in once and stay logged in.
- A custom marker scope (e.g. `freescout-mcp:access`) that carries the audience mapper. The MCP server doesn't check for any specific scope, but a marker scope makes the consent screen explicit and keeps the audience mapping co-located with the resource.

**Tokens this server validates as good:**

```json
{
  "iss": "https://auth.example.com/realms/example",
  "aud": "https://freescout-mcp.example.com",
  "scope": "openid email freescout-mcp:access offline_access",
  "email": "you@example.com",
  "email_verified": true,
  "exp": 1234567890
}
```

## Development

Requirements: Node.js 25+ (matching the `node:25-alpine` runtime image) and npm.

```bash
npm install
npm test               # vitest, 150 tests, no mocks (HTTP fixture-server + in-process MCP loopback)
npm run build          # tsc → dist/
npm run cli -- serve   # run the HTTP server from source via tsx
npm run format         # prettier
```

Tests use a real in-process HTTP fixture-server for FreeScout API interactions and a paired in-process MCP transport (`src/test/mcp-loopback.ts`) for end-to-end tool calls — no mocks.

## License

MIT. See [LICENSE](LICENSE).

---

## Appendix: Keycloak as the authorization server

This appendix walks through configuring [Keycloak](https://www.keycloak.org) 26.x to satisfy the requirements above. It is one worked example, not a recommendation — any RFC 7591-capable AS (Auth0, Authentik, Zitadel, Ory Hydra, etc.) will work with equivalent setup.

The example uses two placeholder hostnames; substitute your own throughout:

- `https://auth.example.com` — Keycloak base URL
- `https://freescout-mcp.example.com` — the public URL of this MCP server (its `PUBLIC_URL`)

### 1. Run Keycloak

A minimal `docker-compose.yml`:

```yaml
name: keycloak

services:
  keycloak-db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${KC_DB_PASSWORD}
    volumes:
      - ./data:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:26.6
    restart: unless-stopped
    depends_on: [keycloak-db]
    command: start
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-db:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KC_DB_PASSWORD}
      KC_HOSTNAME: auth.example.com
      KC_HOSTNAME_STRICT: "true"
      KC_PROXY_HEADERS: xforwarded
      KC_HTTP_ENABLED: "true"
      KC_HTTPS_ENABLED: "false"
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KC_BOOTSTRAP_ADMIN_PASSWORD}
    ports: ["8080:8080"]
```

Generate `.env` and start it:

```bash
printf "KC_DB_PASSWORD=%s\nKC_BOOTSTRAP_ADMIN_PASSWORD=%s\n" \
  "$(openssl rand -hex 32)" "$(openssl rand -hex 24)" > .env
docker compose up -d
```

Terminate TLS with a reverse proxy (Caddy, nginx, Cloudflare Tunnel, …) that forwards to `keycloak:8080` and sets `X-Forwarded-Proto: https`. Then sign in as `admin` at `https://auth.example.com` and change the bootstrap password.

### 2. Create a realm

Create a realm (e.g. `example`) for your application users. Don't put them in the `master` realm — that's reserved for Keycloak admin.

Under **Realm settings → Sessions**, raise the offline session windows so users get a long-lived MCP login:

| Setting | Suggested |
|---|---|
| SSO Session Idle | 30 minutes |
| SSO Session Max | 12 hours |
| **Offline Session Idle** | **30 days** |
| Offline Session Max | 365 days (or unset) |

Under **Realm settings → Tokens**:

- Default signature algorithm: `RS256`
- Access token lifespan: 30 minutes (must be ≤ SSO Session Idle)

Under **Realm settings → Login**: turn off user registration, turn on **Login with email**.

### 3. Create the marker scope with audience binding

This is the only Keycloak-specific concept worth being precise about. The audience mapper lives on a **client scope** rather than on each registered client, so DCR-registered clients automatically get correctly-audienced tokens with no per-client setup.

**Client scopes → Create client scope:**

| Field | Value |
|---|---|
| Name | `freescout-mcp:access` |
| Type | `Optional` |
| Protocol | `openid-connect` |
| Display on consent screen | On |
| Consent screen text | `Access FreeScout` |
| Include in token scope | On |

Then on that scope → **Mappers → Add mapper → By configuration → Audience**:

| Field | Value |
|---|---|
| Name | `freescout-mcp-audience` |
| Included Custom Audience | `https://freescout-mcp.example.com` |
| Add to access token | On |

`offline_access` is built in to every realm — no setup needed. The MCP server advertises both scopes through its protected-resource metadata endpoint, so spec-compliant clients request them automatically.

### 4. Allow Dynamic Client Registration

Anonymous DCR is on by default. Lock the policy down to known client hosts:

**Clients → Client registration → Anonymous access policies → Trusted Hosts**:

- Toggle **Client URIs Must Match** to On.
- Add the hosts your clients will register from. A reasonable starting list:

  ```
  localhost
  127.0.0.1
  claude.ai
  chatgpt.com
  github.com
  cursor.com
  ```

  `github.com` is included because many OSS clients (including the MCP Inspector) submit a `client_uri` pointing at their GitHub repository, which the Trusted Hosts policy validates.

Also set **Max Clients Limit** to a sane cap (e.g. 50).

### 5. Create users

**Users → Add user.** The user's email **must match their FreeScout email address** — that's how this MCP server resolves them. Tick **Email verified** so the `email_verified` claim is true. Set a password under **Credentials**.

### 6. Configure the MCP server

Point the MCP server at Keycloak using the URLs from the realm's OIDC discovery document (`https://auth.example.com/realms/example/.well-known/openid-configuration`):

```bash
docker run -p 8080:8080 \
  -e PUBLIC_URL=https://freescout-mcp.example.com \
  -e OAUTH_AUDIENCE=https://freescout-mcp.example.com \
  -e OAUTH_ISSUER=https://auth.example.com/realms/example \
  -e OAUTH_JWKS_URL=https://auth.example.com/realms/example/protocol/openid-connect/certs \
  -e FREESCOUT_API_URL=https://freescout.example.com/api \
  -e FREESCOUT_API_KEY=... \
  ghcr.io/nialtoservices/freescout-mcp:latest
```

`OAUTH_AUDIENCE` must exactly match the **Included Custom Audience** value from step 3, and the issuer URL must include the realm path.

### Common pitfalls

- **`aud` missing or wrong on access tokens** — the audience mapper isn't on the `freescout-mcp:access` scope, or it isn't ticked **Add to access token**.
- **`invalid issuer` errors from the MCP server** — `OAUTH_ISSUER` is missing the `/realms/<name>` suffix.
- **Users prompted to log in every time** — the client didn't request `offline_access`, or the realm's Offline Session Idle is too short. The MCP server advertises `offline_access` in its PRM; ensure your client respects that.
- **DCR returns 403** — Trusted Hosts doesn't include the client's `client_uri` host. The policy validates `client_uri`, not just redirect URIs.
