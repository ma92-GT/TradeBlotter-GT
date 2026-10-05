import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Run tests in a fixed zone that is not UTC, so UTC-to-local conversion is actually exercised.
process.env.TZ = 'America/New_York'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // The tests cover the store and pure functions, so no DOM is needed.
      environment: 'node',
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
