import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'web-dist',
    chunkSizeWarningLimit: 700
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' }
  }
})

