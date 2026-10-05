import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const apiUrl = 'http://localhost:5080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Forward API calls to the .NET backend so the browser sees a single origin (no CORS).
    proxy: {
      '/trades': apiUrl,
      '/positions': apiUrl,
    },
  },
})
