import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Puerto del backend Express (ver backend/.env -> PORT). Sólo se usa en desarrollo.
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:4000'

// https://vite.dev/config/
export default defineConfig({
  // Proxy de la API en desarrollo.
  //
  // El frontend llama a VITE_API_URL=/api (mismo origen), pero el backend corre
  // en otro puerto (4000). Sin este proxy, Vite responde con el index.html del
  // SPA para /api/* y el cliente recibe HTML en vez de JSON -> "sin conexión".
  // En producción no hace falta: el backend sirve frontend/dist y /api queda
  // en el mismo origen.
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'icons/*.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/offline.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
