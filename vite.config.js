import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cau hinh Vite v0.5:
// - /api/*  → proxy ve Express :3001 (backend)
// - /site/* → proxy ve Express :3001 (public site routes — v0.5)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/site': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
