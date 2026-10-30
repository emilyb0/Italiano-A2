/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Italiano A2 — 14 giorni',
        short_name: 'Italiano A2',
        description: 'Preparación intensiva para el examen A2 de italiano',
        lang: 'es',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'], maximumFileSizeToCacheInBytes: 6_000_000 },
    }),
  ],
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/test/**/*.test.ts'] },
});
