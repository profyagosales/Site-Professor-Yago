import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { bundleAnalyzer } from './scripts/bundle-analyzer.js';

export default defineConfig({
  base: '/',
  plugins: [react(), bundleAnalyzer()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
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
          // PDF libraries em chunk separado
          if (id.includes('react-pdf') || id.includes('pdfjs-dist') || id.includes('pdf-lib')) {
            return 'pdf';
          }
          
          // React e React DOM em chunk separado
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }
          
          // Framer Motion em chunk separado (pesado)
          if (id.includes('framer-motion')) {
            return 'framer';
          }
          
          // React Router em chunk separado
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Axios e outras libs de API
          if (id.includes('axios') || id.includes('api')) {
            return 'api';
          }
          
          // Outras dependências vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'html', 'lcov']
    }
  }
});
