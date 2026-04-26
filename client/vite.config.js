import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl()
  ],
  server: {
    host: true,
    proxy: {
      // Proxy Express API
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Flask API
      '/flask-api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/flask-api/, '')
      }
    }
  }
})
