import { defineConfig } from 'vitest/config'

// own config so tests skip vite.config.ts's Cloudflare/Start plugins, which reject vitest's resolver.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
