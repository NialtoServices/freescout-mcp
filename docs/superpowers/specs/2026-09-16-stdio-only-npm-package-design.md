# Stdio-only npm package — design

## Goal

Reduce freescout-mcp to a single-user stdio MCP server distributed on npm. The HTTP transport, OAuth
bearer-token authentication, the Docker image and its release workflow are removed.

An MCP client launches it with:

```json
{
  "mcpServers": {
    "freescout": {
      "command": "npx",
      "args": ["-y", "@nialtoservices/freescout-mcp"],
      "env": {
        "FREESCOUT_API_URL": "https://help.example.com/api",
        "FREESCOUT_API_KEY": "…",
        "FREESCOUT_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

## Decisions

| Question | Decision |
|---|---|
| Distribution | npm, published manually (as `@taherb/multi-model-mcp` is) |
| Package name | `@nialtoservices/freescout-mcp` (unchanged) |
| Docker image | Dropped; existing GHCR images remain but receive no new versions |
| CLI shape | Bare command — no `stdio` subcommand |
| Acting user | Email address only; no user-ID support |
| Packaging | Single-file esbuild bundle |
| Version | 2.0.0 — removing `serve`, the image and the subcommand breaks existing setups |

### Why a bundle

The source uses 248 extension-less relative imports, many resolving to directory barrels. Node's ESM
loader resolves neither, so plain `tsc` emit would not run without rewriting every import. Shipping
the TypeScript and executing it through `tsx` would make `tsx` a runtime dependency and compile on
every launch. An esbuild bundle yields one self-contained file with no runtime dependencies, matching
multi-model-mcp.

## 1. Remove HTTP and OAuth

- Delete `src/cli/server.ts`.
- Delete `src/authentication/oauth.ts`, `src/authentication/mcp-bearer-handler.ts` and their tests,
  and drop them from `src/authentication/index.ts`.
- In `src/authentication/freescout.ts`, delete `extractEmail` and `readUserFromContext` (HTTP-only)
  along with their tests. `UserResolver` and `AuthenticationError` remain.
- `createMCPServer`'s `getCurrentUser(context)` signature is unchanged, so no tool changes. Its
  docblock loses the reference to HTTP. Narrowing it to a plain `User` is a possible later change,
  not part of this one.
- Remove the test loopback's `authInfo` option from `callTool` (`src/test/mcp-loopback.ts`); no
  test passes it, and it only exists to simulate HTTP-authenticated requests.
- Remove dependencies used only by HTTP — `hono`, `@hono/node-server`, `@modelcontextprotocol/hono`,
  `jose` — and the already-unused `@types/jsonwebtoken` and `@types/ms`.

## 2. Command line

- `freescout-mcp` starts the stdio server directly from the root command.
- Options, each also read from its environment variable, all mandatory:
  - `--freescout-api-url` / `FREESCOUT_API_URL` — must end in `/api`
  - `--freescout-api-key` / `FREESCOUT_API_KEY`
  - `--freescout-user-email` / `FREESCOUT_USER_EMAIL`
- Startup behaviour is unchanged: the email is resolved to a FreeScout user once, and the process
  exits with an error on stderr if no user matches, before accepting any tool calls.
- `src/cli/shared.ts` exists only to share options between transports; it merges into the stdio
  entry point.
- Nothing but JSON-RPC may be written to stdout.

## 3. npm packaging

### `package.json`

- `bin`: `{ "freescout-mcp": "./dist/freescout-mcp.js" }`
- `files`: `["dist"]`
- `publishConfig`: `{ "access": "public" }` — scoped packages publish as restricted by default.
- `engines`: `{ "node": ">=20" }` — required by `@modelcontextprotocol/server`.
- `description`: describes a stdio MCP server rather than an HTTP one.
- Every dependency moves to `devDependencies`, since the bundle inlines them. This includes the
  optional peer `@cfworker/json-schema`, which the SDK uses for JSON Schema validation.

### Scripts

| Script | Command |
|---|---|
| `build` | esbuild bundle of `src/index.ts` to `dist/freescout-mcp.js` |
| `typecheck` | `tsc` (the current `build`) |
| `cli` | `npm run build && node dist/freescout-mcp.js` |
| `prepublishOnly` | `typecheck`, `test`, then `build` |
| `test`, `format`, `format:check` | unchanged |

`tsx` cannot import `.md` files, so once `INSTRUCTIONS.md` is imported as text the source no longer
runs under `tsx`. `cli` runs the bundle instead, and `tsx` is removed.

### Bundle constraints

- **Shebang:** the output starts with `#!/usr/bin/env node`.
- **CommonJS dependencies:** `commander` is CommonJS and `require`s Node built-ins. In an ESM
  bundle, esbuild's `require` shim throws `Dynamic require of "…" is not supported`, so the banner
  also defines `require` via `createRequire(import.meta.url)`.
- **`INSTRUCTIONS.md`:** currently read at runtime from a path relative to `src/server/index.ts`,
  which does not exist relative to the bundle. It is imported as a string instead:
  - `import INSTRUCTIONS from '../../INSTRUCTIONS.md'` in `src/server/index.ts`
  - esbuild `--loader:.md=text`
  - a `declare module '*.md'` type declaration
  - a Vitest plugin in `vitest.config.ts` that loads `.md` files as a default-exported string, so
    tests exercise the same import
- **`package.json` version:** the existing JSON import is inlined by esbuild and needs no change.

## 4. Docker and CI

- Delete `Dockerfile`, `.dockerignore` and `.github/workflows/container.yml`.
- Publishing is `npm publish`, guarded by `prepublishOnly`.

## 5. Documentation

- `README.md`:
  - Opening description and Quick start: stdio via `npx -y @nialtoservices/freescout-mcp`, with a
    client configuration example.
  - Configuration: the three options and environment variables.
  - Remove the Docker quick start, `serve` configuration, Authentication model, Authorization
    server requirements and the Keycloak appendix.
  - Development: `npm run cli`, `typecheck`, `test`, `build`.
- `INSTRUCTIONS.md` makes no reference to transports and is unchanged.

## Verification

- `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build` all pass.
- `npm pack --dry-run` lists only `dist/freescout-mcp.js`, `README.md`, `LICENSE` and
  `package.json`.
- Smoke test of the built bundle: start a local stub of the FreeScout users endpoint, spawn
  `dist/freescout-mcp.js` with the three variables, send `initialize` then `tools/list` over stdin,
  and confirm the tools are listed, the instructions are present, and stdout carries only JSON-RPC.
- The smoke test also confirms an unknown email exits non-zero with an error on stderr.

## Commit sequence

1. Remove the HTTP transport and OAuth authentication
2. Run the stdio server from the root command
3. Bundle for npm and remove the Docker image
4. Rewrite the README for stdio via npx
5. Bump version to 2.0.0

## Out of scope

- Creating the `nialtoservices` npm organisation, `npm login`, and publishing — publishing happens
  only with explicit approval.
- Moving MCP clients off `mcp-freescout.nialtoservices.co.uk` and decommissioning that host.
- User-ID support for the acting user.
- Narrowing `getCurrentUser` or simplifying `UserResolver`'s cache.
