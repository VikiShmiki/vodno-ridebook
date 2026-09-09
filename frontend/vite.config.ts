import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The app always calls the API with relative /api paths. In development Vite
// proxies them to the local backend; in a container nginx or the Kubernetes
// Ingress performs the same routing.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
