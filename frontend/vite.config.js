import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/',
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
    exclude: ['react-pdf', 'react-pdf-highlighter', 'pdfjs-dist'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
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
    port: 5173,
    proxy: {
      // tudo que começa com /api vai para o backend local
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
