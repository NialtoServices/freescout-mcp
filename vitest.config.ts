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
