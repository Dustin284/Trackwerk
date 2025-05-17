import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Server-Konfiguration
  server: {
    port: 5173,
    open: true, // Öffnet den Browser automatisch
    host: true  // Erlaubt den Zugriff von anderen Geräten im Netzwerk
  },
  // CSS-Verarbeitung optimieren
  css: {
    devSourcemap: true,
  },
  build: {
    sourcemap: true,
  }
})
