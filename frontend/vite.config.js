import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/bing-wallpaper': {
        target: 'https://www.bing.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bing-wallpaper/, ''),
        secure: false,
      }
    }
  }
})
