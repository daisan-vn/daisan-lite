import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cau hinh Vite cho frontend React
// - Chay tren port 5173
// - Tat ca request den /api/* se duoc proxy sang server tren port 3001
//   (giup tranh van de CORS khi dev)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
