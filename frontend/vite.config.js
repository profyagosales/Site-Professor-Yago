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
      // Evite alias diretos para react/react-dom para não quebrar a resolução em dependências
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
            if (/(^|\/)(react|react-dom|react-router)(\/|$)|react\/jsx-runtime/.test(id)) {
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
