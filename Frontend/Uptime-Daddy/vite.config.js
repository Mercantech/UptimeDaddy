import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss',
  },
  build: {
    cssMinify: false,
  },
  server: {
    allowedHosts: ['.mercantec.tech', 'localhost'],
  },
  preview: {
    // Tillad Host-header fra Cloudflare Tunnel / produktionsdomæne (npm run preview)
    allowedHosts: ['.mercantec.tech', 'localhost'],
  },
})
