import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache the wasm engine + everything else needed for the app's
      // required offline core functionality (see architecture notes) —
      // extended further once the wasm build artifacts actually exist.
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Minecraft Ore Finder',
        short_name: 'Ore Finder',
        description: 'Find ore locations from your Minecraft world seed',
        theme_color: '#15120f',
        background_color: '#15120f',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,png,svg}'],
      },
    }),
  ],
});
