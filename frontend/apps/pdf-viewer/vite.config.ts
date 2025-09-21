import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  base: '/viewer/',
  plugins: [react()],
  resolve: {
    // Garantir singleton de React e resolver jsx-runtime corretamente
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'scheduler'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['react-pdf', 'react-pdf-highlighter', 'pdfjs-dist'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/(^|\/)react-pdf(\/|$)|pdfjs-dist|react-pdf-highlighter/.test(id)) {
              return 'pdf';
            }
            if (/(^|\/)(react|react-dom|react-router)(\/|$)|react\/jsx-runtime/.test(id)) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
});
