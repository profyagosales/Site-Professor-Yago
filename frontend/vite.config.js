import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'warning', replacement: path.resolve(__dirname, 'src/shims/warning.js') },
      { find: 'react/jsx-runtime', replacement: path.resolve(__dirname, 'node_modules/react/jsx-runtime.js') },
      { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react/index.js') },
      { find: 'react-dom/client', replacement: path.resolve(__dirname, 'node_modules/react-dom/client.js') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom/index.js') },
      // força pdf.js legacy para evitar TDZ / CJS mix
      { find: 'pdfjs-dist/build/pdf', replacement: 'pdfjs-dist/legacy/build/pdf' },
      { find: 'pdfjs-dist/build/pdf.worker', replacement: 'pdfjs-dist/legacy/build/pdf.worker' },
      { find: /^pdfjs-dist$/, replacement: 'pdfjs-dist/legacy/build/pdf' },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  optimizeDeps: {
    exclude: ['react-pdf', 'pdfjs-dist', 'react-pdf-highlighter', 'warning'],
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
    modulePreload: false, // evita pré-carregar chunks de PDF na home
    commonjsOptions: { transformMixedEsModules: true },
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
