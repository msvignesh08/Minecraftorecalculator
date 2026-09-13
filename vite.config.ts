import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Only matters for GitHub Pages, which serves from /<repo-name>/ instead
  // of the domain root. Vercel/Netlify ignore this (they serve from root),
  // so it's safe to leave set either way.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache the wasm engine + everything else needed for the app's
      // required offline core functionality (see architecture notes) —
      // extended further once the wasm build artifacts actually exist.
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Ore Atlas by Vignesh',
        short_name: 'Ore Atlas',
        description: 'Explore biome maps and unconfirmed ore candidates from your Minecraft seed',
        theme_color: '#1b271f',
        background_color: '#1b271f',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,json,txt}'],
        maximumFileSizeToCacheInBytes: 4000000,
      },
    }),
  ],
});
