import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-pdf',
      'pdfjs-dist',
      'react-pdf-highlighter'
    ],
    esbuildOptions: {
      // garante CJS ok em libs antigas
      supported: { 'top-level-await': true }
    }
  },
  build: {
    commonjsOptions: {
      include: [/react-pdf-highlighter/, /pdfjs-dist/, /node_modules/],
      transformMixedEsModules: true,
    }
  }
});
