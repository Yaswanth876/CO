import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'tce-logo.png', 'tce-banner.png'],
      manifest: {
        name: 'TCE CO Attainment System',
        short_name: 'TCE COAS',
        description: 'Course Outcome Attainment System for Thiagarajar College of Engineering',
        theme_color: '#7f1d1d',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'tce-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'tce-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000,
  },
})