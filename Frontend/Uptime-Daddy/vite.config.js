import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss',
  },
  build: {
    // lightningcss fejler på semantic-ui-css; esbuild håndterer det.
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor';
          }
          if (
            id.includes('node_modules/semantic-ui-react/') ||
            id.includes('node_modules/semantic-ui-css/')
          ) {
            return 'semantic';
          }
          if (id.includes('node_modules/recharts/')) {
            return 'recharts';
          }
        },
      },
    },
  },
  server: {
    allowedHosts: ['.mercantec.tech', 'localhost'],
  },
})
