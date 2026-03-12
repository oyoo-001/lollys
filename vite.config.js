import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

// These two lines are necessary for ESM (import/export) syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['https://res.cloudinary.com/dxzmo0roe/image/upload/v1773320325/launchericon-192x192_kroqmj.png', 'https://res.cloudinary.com/dxzmo0roe/image/upload/v1773320325/apple-touch-icon_kroqmj.png'],
      manifest: {
        name: 'Lollys Collection',
        short_name: 'Lollys',
        description: 'Premium products for every lifestyle. Quality meets affordability.',
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'https://res.cloudinary.com/dxzmo0roe/image/upload/v1773320325/launchericon-192x192_kroqmj.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://res.cloudinary.com/dxzmo0roe/image/upload/v1773320325/launchericon-512x512_kroqmj.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })],
  resolve: {
    alias: {
      // This tells Vite: whenever you see "@", look in the "src" folder
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});

