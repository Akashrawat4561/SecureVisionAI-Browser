import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/renderer'),
    },
  },
  base: './',
  build: {
    outDir: 'dist-electron/renderer',
    emptyOutDir: true,
  },
  ssr: {
    noExternal: [/^@securevision/],
    external: ['electron', 'electron-updater'],
  },
})
