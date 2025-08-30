import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-pdf', 'pdfjs-dist', 'react-pdf-highlighter'],
    esbuildOptions: { target: 'es2020' }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-pdf') || id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'pdf'
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    },
    commonjsOptions: { include: [/node_modules/] },
    chunkSizeWarningLimit: 1200,
    target: 'es2020'
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
