import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2019',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 8080,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
