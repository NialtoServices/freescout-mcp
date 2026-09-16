# Stdio-only npm Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce freescout-mcp to a single-user stdio MCP server published to npm as a bundled
`freescout-mcp` command, removing the HTTP transport, OAuth, and the Docker image.

**Architecture:** The HTTP entry point and OAuth modules are deleted; the existing stdio command
becomes the program's root command. esbuild bundles `src/index.ts` and every dependency into one
executable ESM file, `dist/freescout-mcp.js`, with `INSTRUCTIONS.md` inlined as text. Tools,
the FreeScout client and schemas are untouched.

**Tech Stack:** TypeScript 6, Node.js ≥ 20, `@modelcontextprotocol/server` 2.0.0-alpha, commander 14,
zod 4, Vitest 4, esbuild 0.28, Prettier 3.

**Spec:** `docs/superpowers/specs/2026-09-16-stdio-only-npm-package-design.md`

## Global Constraints

- Package name stays `@nialtoservices/freescout-mcp`; `bin` is `{ "freescout-mcp": "./dist/freescout-mcp.js" }`.
- `engines.node` is `>=20`; `publishConfig.access` is `public`.
- Exactly three mandatory settings, each a flag or environment variable: `--freescout-api-url` /
  `FREESCOUT_API_URL`, `--freescout-api-key` / `FREESCOUT_API_KEY`, `--freescout-user-email` /
  `FREESCOUT_USER_EMAIL`. Email only — no user-ID support.
- Nothing but JSON-RPC may be written to stdout by the server.
- Do not push, tag or `npm publish`. Publishing happens only with the user's explicit approval.
- `npm run format:check` already fails on HEAD because of `src/server/tools/users/whoami.ts`. Do not
  fix that file as part of this work; check formatting of touched files with `npx prettier --check <files>`.
- Inline comments explain why, not what, and state a present-tense constraint; leave a blank line
  before an inline comment unless it is the first line of a block. Keep existing comments on moved
  code verbatim.
- Test names follow the existing `is expected to …` style.
- Commit messages: capitalised imperative subject, no prefix, no trailing full stop, about 50
  characters; a body only when the why isn't obvious. Every commit message ends with:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HcVPNYWekPwJ2onbzVD9DW
  ```

- Start each task on a clean tree (`git status --short` prints nothing).

---

### Task 1: Remove the HTTP transport and OAuth authentication

**Files:**
- Delete: `src/cli/server.ts`
- Delete: `src/authentication/oauth.ts`, `src/authentication/oauth.test.ts`
- Delete: `src/authentication/mcp-bearer-handler.ts`, `src/authentication/mcp-bearer-handler.test.ts`
- Modify: `src/authentication/index.ts`
- Modify: `src/authentication/freescout.ts`
- Modify: `src/authentication/freescout.test.ts`
- Modify: `src/index.ts`
- Modify: `src/server/index.ts` (docblock of `getCurrentUser` only)
- Modify: `src/test/mcp-loopback.ts`
- Modify: `package.json`, `package-lock.json` (via `npm uninstall`)

**Interfaces:**
- Consumes: nothing.
- Produces: `src/authentication` exports only `AuthenticationError` and
  `UserResolver` (`new UserResolver(client: Client, ttlInMilliseconds?: number)`,
  `resolve(email: string): Promise<User>`). `startMcpLoopback(server)` returns
  `callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>` — no third argument.

This task only removes code, so there is no new failing test; the existing suite is the regression check.

- [ ] **Step 1: Delete the HTTP entry point and OAuth modules**

```bash
git rm -q src/cli/server.ts \
  src/authentication/oauth.ts src/authentication/oauth.test.ts \
  src/authentication/mcp-bearer-handler.ts src/authentication/mcp-bearer-handler.test.ts
```

- [ ] **Step 2: Reduce the authentication barrel**

Replace the whole of `src/authentication/index.ts` with:

```ts
export * from './freescout'
```

- [ ] **Step 3: Remove the HTTP-only context readers from `src/authentication/freescout.ts`**

Delete the first import line (`import { type ServerContext } from '@modelcontextprotocol/server'`)
and the `extractEmail` and `readUserFromContext` functions together with their docblocks. The file
then begins:

```ts
import { Client, type User } from '../lib/freescout'

/** Thrown when an error occurs during the authentication process. */
export class AuthenticationError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Resolves verified email addresses to FreeScout users, caching successful lookups for a
```

The `UserResolver` class that follows is unchanged.

- [ ] **Step 4: Remove the matching tests from `src/authentication/freescout.test.ts`**

Delete line 1 (`import { type ServerContext } …`), the `makeContext` helper and its docblock, and the
whole `describe('extractEmail', …)` and `describe('readUserFromContext', …)` blocks. Change the
import of the module under test to:

```ts
import { AuthenticationError, UserResolver } from './freescout'
```

The file then reads, from the top, imports → `const minimalUser = { … }` → blank line →
`describe('UserResolver', …)` (unchanged).

- [ ] **Step 5: Unregister the `serve` command in `src/index.ts`**

Replace the whole file with:

```ts
import { Command } from 'commander'
import { registerStdioCommand } from './cli/stdio'

/**
 * Creates the command-line interface for serving the MCP resource server.
 *
 * @returns Configured CLI command.
 */
function createProgram(): Command {
  const program = new Command()
  program.name('freescout-mcp').description('FreeScout MCP command-line interface')

  registerStdioCommand(program)

  return program
}

try {
  await createProgram().parseAsync(process.argv)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
```

- [ ] **Step 6: Update the `getCurrentUser` docblock in `src/server/index.ts`**

Replace the docblock above `getCurrentUser: (context: ServerContext) => User` with:

```ts
  /**
   * Returns the FreeScout user the server acts as.
   *
   * The entry point resolves the user once at startup, before any tool handler runs. Tools that need
   * caller identity (e.g. for `byUser` attribution) can call this synchronously; tools that don't
   * can ignore it.
   */
```

Leave the signature and the rest of the file unchanged.

- [ ] **Step 7: Drop the `authInfo` option from `src/test/mcp-loopback.ts`**

1. Remove `AuthInfo,` from the `import type { … } from '@modelcontextprotocol/server'` list.
2. Replace the `callTool` member of the `McpLoopback` interface (docblock included) with:

```ts
  /** Invokes a registered tool by name and returns its `CallToolResult`. */
  callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>
```

3. Replace the `sendRequest` function (docblock included) with:

```ts
  /** Sends a JSON-RPC request to the server and awaits the matching response. */
  function sendRequest<TResult>(method: string, params: Record<string, unknown>): Promise<TResult> {
    const id = nextRequestId++
    const message: JSONRPCMessage = { jsonrpc: '2.0', id, method, params }

    return new Promise<TResult>((resolve, reject) => {
      pending.set(id, { resolve: (value) => resolve(value as TResult), reject })
      transport.onmessage?.(message)
    })
  }
```

4. Replace the returned `callTool` implementation with:

```ts
    async callTool(name, args) {
      return sendRequest<CallToolResult>('tools/call', { name, arguments: args })
    },
```

- [ ] **Step 8: Uninstall the HTTP-only and unused packages**

```bash
npm uninstall hono @hono/node-server @modelcontextprotocol/hono jose @types/jsonwebtoken @types/ms
```

Expected: `package.json` no longer lists any of the six; `package-lock.json` is updated.

- [ ] **Step 9: Check nothing still refers to the removed code**

Run: `grep -rn -E "hono|jose|oauth|OAuth|[Bb]earer|readUserFromContext|extractEmail|authInfo|AuthInfo|registerServerCommand" src`
Expected: no output. Investigate and remove any match that belongs to the HTTP transport.

- [ ] **Step 10: Format, type-check and test**

```bash
npx prettier --write src/authentication/index.ts src/authentication/freescout.ts src/authentication/freescout.test.ts src/index.ts src/server/index.ts src/test/mcp-loopback.ts
npm run build
npm test
```

Expected: `tsc` exits 0 with no output (at this point `build` is still `tsc`); every Vitest file passes.

- [ ] **Step 11: Commit**

```bash
git add -A src package.json package-lock.json
git commit -F - <<'EOF'
Remove the HTTP transport and OAuth authentication

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HcVPNYWekPwJ2onbzVD9DW
EOF
```

---

### Task 2: Run the stdio server from the root command

**Files:**
- Modify: `src/cli/stdio.ts` (rewritten)
- Delete: `src/cli/shared.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `UserResolver` from `src/authentication` (Task 1); `Client` from `src/lib/freescout`;
  `createMCPServer(client, { getCurrentUser })` from `src/server`.
- Produces: `configureStdioCommand(command: Command): void`, which adds the three mandatory options
  and the stdio server action to the given command. `src/index.ts` applies it to the root program.

There is no automated CLI test in this codebase; the command is verified by running it (Step 5) and
end-to-end by the bundle smoke test in Task 3.

- [ ] **Step 1: Rewrite `src/cli/stdio.ts`**

Replace the whole file with:

```ts
import { StdioServerTransport } from '@modelcontextprotocol/server'
import { Command, Option } from 'commander'
import { UserResolver } from '../authentication'
import { Client } from '../lib/freescout'
import { createMCPServer } from '../server'

/** Options accepted by the stdio MCP server command. */
interface StdioCommandOptions {
  /**
   * Email address identifying the calling FreeScout user.
   *
   * Stdio is a single-user transport: there is no per-request authentication context, so the email
   * is supplied once at process startup and reused for every tool invocation. Write tools that need
   * to populate `byUser` attribution against FreeScout will resolve this email to a FreeScout user.
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
```

The option descriptions, the `freescoutUserEmail` docblock and the comment in `runStdioServer` are
carried over verbatim from the old `stdio.ts` and `shared.ts`.

- [ ] **Step 2: Delete `src/cli/shared.ts`**

```bash
git rm -q src/cli/shared.ts
```

- [ ] **Step 3: Configure the root program in `src/index.ts`**

Replace the whole file with:

```ts
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
```

- [ ] **Step 4: Format, type-check and test**

```bash
npx prettier --write src/cli/stdio.ts src/index.ts
npm run build
npm test
```

Expected: `tsc` exits 0; every Vitest file passes.

- [ ] **Step 5: Run the command**

Run: `node --import tsx src/index.ts --help`
Expected: usage `freescout-mcp [options]`, the three `--freescout-*` options each marked with their
`env:` variable, and no `Commands:` section.

Run: `env -u FREESCOUT_API_URL -u FREESCOUT_API_KEY -u FREESCOUT_USER_EMAIL node --import tsx src/index.ts; echo "exit $?"`
Expected: `error: required option '--freescout-user-email <email>' not specified` on stderr and a
non-zero exit.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -F - <<'EOF'
Run the stdio server from the root command

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HcVPNYWekPwJ2onbzVD9DW
EOF
```

---

### Task 3: Bundle for npm and remove the Docker image

**Files:**
- Modify: `src/index.ts` (add hashbang)
- Create: `src/types/markdown.d.ts`
- Modify: `src/server/index.ts` (import instructions as text)
- Modify: `vitest.config.ts`
- Modify: `package.json`, `package-lock.json`
- Delete: `Dockerfile`, `.dockerignore`, `.github/workflows/container.yml`
- Scratch (not committed): `freescout-mcp-smoke-test.mjs` in a directory outside the repository

**Interfaces:**
- Consumes: the root command from Task 2.
- Produces: `npm run build` writes `dist/freescout-mcp.js`; `npm run typecheck` runs `tsc`;
  `import INSTRUCTIONS from '../../INSTRUCTIONS.md'` yields a `string` under esbuild and Vitest.

Verified beforehand in a scratch project: esbuild 0.28.2 keeps the entry file's hashbang on line 1
above the banner; the `createRequire` banner makes a bundled CommonJS `require('node:events')` work;
`--loader:.md=text` imports Markdown as a string; the Vitest plugin below loads `.md` as a string;
and `tsx` fails to import `.md` (`SyntaxError`), which is why `cli` runs the bundle.

- [ ] **Step 1: Add the hashbang to `src/index.ts`**

Insert as the very first line of the file:

```ts
#!/usr/bin/env node
```

- [ ] **Step 2: Declare Markdown modules**

Create `src/types/markdown.d.ts`:

```ts
/**
 * Markdown files imported as their raw text: esbuild's `text` loader in the build, and the plugin in
 * `vitest.config.ts` in tests.
 */
declare module '*.md' {
  const content: string
  export default content
}
```

- [ ] **Step 3: Import the instructions as text in `src/server/index.ts`**

1. Delete the imports `import { readFileSync } from 'node:fs'` and `import { fileURLToPath } from 'node:url'`.
2. Delete these two lines:

```ts
const INSTRUCTIONS_PATH = fileURLToPath(new URL('../../INSTRUCTIONS.md', import.meta.url))
const INSTRUCTIONS = readFileSync(INSTRUCTIONS_PATH, 'utf8')
```

3. Add this import alongside the other relative imports:

```ts
import INSTRUCTIONS from '../../INSTRUCTIONS.md'
```

Nothing else in the file changes; `INSTRUCTIONS` keeps its name and uses.

- [ ] **Step 4: Load Markdown as text in tests**

Replace the whole of `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'markdown-as-text',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('.md')) return

        return { code: `export default ${JSON.stringify(code)}`, map: null }
      }
    }
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
```

- [ ] **Step 5: Run the tests to confirm the instructions still load**

Run: `npm test`
Expected: every Vitest file passes. The tool test files call `createMCPServer`, which now imports
`INSTRUCTIONS.md`; without the plugin they fail to parse the Markdown file.

- [ ] **Step 6: Swap `tsx` for esbuild**

```bash
npm uninstall tsx
npm install --save-dev esbuild@^0.28.2
```

- [ ] **Step 7: Rewrite `package.json` for publishing**

Replace the whole of `package.json` with the following. Every runtime dependency moves to
`devDependencies` because the bundle inlines it; keep the version ranges exactly as they are in the
file after Step 6 if any differ from those shown.

```json
{
  "name": "@nialtoservices/freescout-mcp",
  "version": "1.3.1",
  "description": "A stdio MCP server that provides access to FreeScout via the API module.",
  "author": "Toby Herbert",
  "keywords": [
    "freescout",
    "mcp"
  ],
  "license": "MIT",
  "repository": "https://github.com/nialtoservices/freescout-mcp",
  "type": "module",
  "bin": {
    "freescout-mcp": "./dist/freescout-mcp.js"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=20"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --format=esm --loader:.md=text --banner:js=\"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);\" --outfile=dist/freescout-mcp.js",
    "cli": "npm run build && node dist/freescout-mcp.js",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",
    "prepublishOnly": "npm run typecheck && npm test && npm run build",
    "test": "vitest run",
    "typecheck": "tsc"
  },
  "devDependencies": {
    "@cfworker/json-schema": "^4.1.1",
    "@ianvs/prettier-plugin-sort-imports": "^4.7.1",
    "@modelcontextprotocol/server": "^2.0.0-alpha.2",
    "@types/luxon": "^3.7.1",
    "@types/node": "^25.5.0",
    "commander": "^14.0.3",
    "esbuild": "^0.28.2",
    "luxon": "^3.7.2",
    "prettier": "^3.8.3",
    "typescript": "^6.0.3",
    "vitest": "^4.1.5",
    "zod": "^4.3.6"
  }
}
```

Then run `npm install` so `package-lock.json` records the moved dependencies.

The banner defines `require` because `commander` is CommonJS and calls `require` on Node built-ins,
which esbuild's ESM output otherwise rejects with `Dynamic require of "…" is not supported`.

- [ ] **Step 8: Remove the Docker image and its workflow**

```bash
git rm -q Dockerfile .dockerignore .github/workflows/container.yml
```

Expected: `.github` no longer exists in the working tree (it held only that workflow).

- [ ] **Step 9: Type-check, test and build**

```bash
npx prettier --write src/index.ts src/types/markdown.d.ts src/server/index.ts vitest.config.ts
npm run typecheck
npm test
npm run build
head -2 dist/freescout-mcp.js
```

Expected: `tsc` exits 0; all tests pass; esbuild prints `dist/freescout-mcp.js` with no errors or
warnings about unresolved imports (if any appear, stop and report them); `head` prints
`#!/usr/bin/env node` then the `createRequire` banner line.

- [ ] **Step 10: Check the package contents**

Run: `npm pack --dry-run 2>&1 | grep -A10 'Tarball Contents'`
Expected: exactly `LICENSE`, `README.md`, `dist/freescout-mcp.js` and `package.json`.

- [ ] **Step 11: Write the smoke test outside the repository**

Create `freescout-mcp-smoke-test.mjs` in a scratch directory outside the repository (the session
scratchpad when run by an agent):

```js
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createInterface } from 'node:readline'

const BUNDLE_PATH = process.argv[2]
const KNOWN_EMAIL = 'ada@example.com'
const UNKNOWN_EMAIL = 'ghost@example.com'
const REQUEST_TIMEOUT_MS = 10_000

const knownUser = {
  id: 7,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: KNOWN_EMAIL,
  role: 'admin',
  alternateEmails: null,
  jobTitle: null,
  phone: null,
  timezone: 'UTC',
  photoUrl: null,
  language: 'en',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
}

// Stands in for FreeScout's `GET /api/users?email=…`, the only request the server makes at startup.
const stubServer = createServer((request, response) => {
  const requestURL = new URL(request.url, 'http://localhost')
  if (requestURL.pathname !== '/api/users') {
    response.writeHead(404).end()
    return
  }

  const users = requestURL.searchParams.get('email') === KNOWN_EMAIL ? [knownUser] : []
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(
    JSON.stringify({ _embedded: { users }, page: { size: 50, totalElements: users.length, totalPages: 1, number: 1 } })
  )
})

await new Promise((resolve) => stubServer.listen(0, '127.0.0.1', resolve))
const apiURL = `http://127.0.0.1:${stubServer.address().port}/api`

function launch(email) {
  const childProcess = spawn(process.execPath, [BUNDLE_PATH], {
    env: { ...process.env, FREESCOUT_API_URL: apiURL, FREESCOUT_API_KEY: 'smoke-test', FREESCOUT_USER_EMAIL: email },
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const output = { stderr: '', nonJSONLines: [] }
  childProcess.stderr.on('data', (chunk) => (output.stderr += chunk))
  return { childProcess, output }
}

async function checkKnownUser() {
  const { childProcess, output } = launch(KNOWN_EMAIL)
  const waiters = new Map()

  createInterface({ input: childProcess.stdout }).on('line', (line) => {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      output.nonJSONLines.push(line)
      return
    }

    waiters.get(message.id)?.(message)
  })

  function send(message) {
    childProcess.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
  }

  function request(id, method, params) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Timed out waiting for ${method}; stderr: ${output.stderr}`)),
        REQUEST_TIMEOUT_MS
      )
      waiters.set(id, (message) => {
        clearTimeout(timeout)
        resolve(message)
      })
      send({ id, method, params })
    })
  }

  const initializeResponse = await request(1, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0.0.0' }
  })
  send({ method: 'notifications/initialized' })
  const toolsListResponse = await request(2, 'tools/list', {})
  childProcess.kill()

  assert.equal(initializeResponse.result.serverInfo.name, 'freescout-mcp')
  assert.match(initializeResponse.result.instructions, /^# FreeScout MCP/)
  assert.equal(toolsListResponse.result.tools.length, 22)
  assert.deepEqual(output.nonJSONLines, [], 'stdout must carry only JSON-RPC')
  console.log(`ok - ${KNOWN_EMAIL}: initialize, instructions and 22 tools over clean stdout`)
}

async function checkUnknownUser() {
  const { childProcess, output } = launch(UNKNOWN_EMAIL)
  let stdout = ''
  childProcess.stdout.on('data', (chunk) => (stdout += chunk))
  childProcess.stdin.end()

  const exitCode = await new Promise((resolve) => childProcess.on('exit', resolve))

  assert.notEqual(exitCode, 0)
  assert.match(output.stderr, new RegExp(`No FreeScout user found with email ${UNKNOWN_EMAIL}`))
  assert.equal(stdout, '')
  console.log(`ok - ${UNKNOWN_EMAIL}: exits ${exitCode} with the error on stderr`)
}

try {
  await checkKnownUser()
  await checkUnknownUser()
  console.log('Smoke test passed')
} finally {
  stubServer.close()
}
```

- [ ] **Step 12: Run the smoke test against the bundle**

Run: `node <scratch directory>/freescout-mcp-smoke-test.mjs dist/freescout-mcp.js`
Expected:

```
ok - ada@example.com: initialize, instructions and 22 tools over clean stdout
ok - ghost@example.com: exits 1 with the error on stderr
Smoke test passed
```

- [ ] **Step 13: Commit**

```bash
git add -A src vitest.config.ts package.json package-lock.json
git commit -F - <<'EOF'
Bundle for npm and remove the Docker image

The source's extension-less and directory imports don't resolve under
Node's ESM loader, so esbuild bundles everything into one executable
file. INSTRUCTIONS.md is inlined as text because the bundle has no
source tree to read it from at runtime.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HcVPNYWekPwJ2onbzVD9DW
EOF
```

---

### Task 4: Rewrite the README for stdio via npx

**Files:**
- Modify: `README.md` (rewritten)

**Interfaces:**
- Consumes: package name, `bin`, scripts and options from Tasks 2–3.
- Produces: nothing code-facing.

- [ ] **Step 1: Replace the whole of `README.md`**

````markdown
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

The resolved user is injected into the tool's request context. Tools that author content (`create_conversation`, `add_conversation_note`, `draft_conversation_reply`) attach it as the author; `update_conversation` forwards it as `byUser` so the timeline records who did what.

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
````

- [ ] **Step 2: Check nothing HTTP- or Docker-related remains**

Run: `grep -n -i -E "\bserve\b|oauth|docker|keycloak|bearer|ghcr|tsx|8080" README.md`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
Rewrite the README for stdio via npx

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HcVPNYWekPwJ2onbzVD9DW
EOF
```

---

### Task 5: Bump version to 2.0.0

**Files:**
- Modify: `package.json` (`version` only)

**Interfaces:**
- Consumes: everything above.
- Produces: the release candidate. Not tagged, pushed or published.

Previous bumps (`Bump version to 1.3.0`, `Bump version to 1.3.1`) changed only `package.json`; follow that.

- [ ] **Step 1: Set the version**

In `package.json`, change `"version": "1.3.1"` to `"version": "2.0.0"`.

- [ ] **Step 2: Final verification**

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run 2>&1 | grep -E 'name:|version:|Tarball Contents' -A0
node <scratch directory>/freescout-mcp-smoke-test.mjs dist/freescout-mcp.js
git status --short
```

Expected: type check and tests pass; build succeeds; `npm pack` reports
`@nialtoservices/freescout-mcp` version `2.0.0`; the smoke test passes; `git status` shows only
`package.json`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -F - <<'EOF'
Bump version to 2.0.0

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HcVPNYWekPwJ2onbzVD9DW
EOF
```
