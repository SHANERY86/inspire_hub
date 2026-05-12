import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/inspire-hub/',
  plugins: [react()],
  server: {
    proxy: {
      // App uses base `/inspire-hub/` so API URLs are `/inspire-hub/api/...` (see App.jsx apiUrl).
      // Django is mounted at `/api/v1/` when URL_PATH_PREFIX is empty — strip the SPA base here.
      '^/inspire-hub/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/inspire-hub/, ''),
      },
    },
  },
})
