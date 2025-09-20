import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      warning: path.resolve(__dirname, 'src/shims/warning.js'),
    },
  },
  optimizeDeps: {
    // não pré-bundle as libs de PDF; elas virão só no import dinâmico
    exclude: ['react-pdf', 'react-pdf-highlighter', 'pdfjs-dist', 'react-konva', 'konva'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-pdf') || id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'pdf'
          if (id.includes('react-konva') || id.includes('konva')) return 'konva'
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
});
