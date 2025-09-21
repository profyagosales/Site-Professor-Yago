import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'no-preload-pdf-konva',
      transformIndexHtml(html) {
        // remove modulepreload de assets/pdf-*.js e assets/ReactKonva-*.js
        return html.replace(/<link rel="modulepreload"[^>]+assets\/(pdf|ReactKonva)-[^>]+>/g, '');
      },
    },
  ],
  resolve: {
    preserveSymlinks: true,
    // Garanta uma única instância de React/ReactDOM em todos os chunks
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'scheduler'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    manifest: true,
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
        // Evita que o Vite gere <link rel="modulepreload"> para imports dinâmicos analisados
        inlineDynamicImports: false,
      },
      // workaround: evitar resolução fora do workspace por symlink
      external: [],
    },
  },
  optimizeDeps: {
    // evita pré-bundle dessas libs no dev, o que costuma “grudar” na entry
    exclude: ['react-pdf', 'react-pdf-highlighter', 'pdfjs-dist', 'react-konva', 'konva'],
    include: ['react', 'react-dom'],
  },
});
