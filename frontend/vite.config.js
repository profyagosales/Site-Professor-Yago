import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    exclude: ['react-pdf', 'pdfjs-dist', 'pdfjs-dist/build/pdf.worker.min.js', 'warning'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-pdf') || id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'pdf'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
    commonjsOptions: { include: [/react-pdf-highlighter/, /pdfjs-dist/, /node_modules/], transformMixedEsModules: true },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      '/api': {
  // Durante dev, proxy para o backend local. Pode ser sobrescrito por VITE_API_URL.
  target: process.env.VITE_API_URL || 'http://localhost:5050',
        changeOrigin: true,
  // Não reescreve o prefixo, já que o backend usa /api como prefixo padrão
  // mantendo o caminho intacto para evitar confusões de cabeçalhos
  // rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
