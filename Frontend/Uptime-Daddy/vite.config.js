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
    host: true,
    // Bag Cloudflare Tunnel / reverse proxy: tillad det Host-header edge sender (preview er kun statisk bundle)
    allowedHosts: true,
    // Undgå at browser/edge holder fast i gammelt index.html + gamle hashed assets efter deploy
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
