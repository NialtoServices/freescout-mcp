/**
 * Markdown files imported as their raw text: esbuild's `text` loader in the build, and the plugin in
 * `vitest.config.ts` in tests.
 */
declare module '*.md' {
  const content: string
  export default content
}
