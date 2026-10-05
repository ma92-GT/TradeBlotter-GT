import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

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
