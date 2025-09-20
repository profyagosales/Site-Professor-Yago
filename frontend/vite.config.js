import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    // Garanta uma única instância de React/ReactDOM em todos os chunks
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
    },
  },
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id) => (/pdfjs-dist/).test(id) ? false : null,
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separe explicitamente os pacotes pesados em chunks nomeados
            if (/(^|\/)react-pdf(\/|$)|pdfjs-dist|react-pdf-highlighter/.test(id)) {
              return 'pdf';
            }
            if (/(^|\/)(react|react-dom|react-router)(\/|$)/.test(id)) {
              return 'vendor';
            }
          }
        },
      },
      // workaround: evitar resolução fora do workspace por symlink
      external: [],
    },
  },
  optimizeDeps: {
    exclude: ['react-pdf', 'react-pdf-highlighter', 'pdfjs-dist', 'react-konva', 'konva'],
  },
});
