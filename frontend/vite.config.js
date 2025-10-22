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
        manualChunks: {
          pdf: ['react-pdf', 'pdfjs-dist'],
          ReactKonva: ['react-konva', 'konva'],
        },
        // Garante que react/react-dom ficam no vendor separado
        // (o Vite ainda pode criar vendor automaticamente; mantemos dedupe para singleton)
        // Evita que o Vite gere <link rel="modulepreload"> para imports dinâmicos analisados
        inlineDynamicImports: false,
      },
      // Não externalizar React; manter tudo internal
      external: [],
    },
    commonjsOptions: { transformMixedEsModules: true },
  },
  optimizeDeps: {
    // evita pré-bundle dessas libs no dev, o que costuma “grudar” na entry
    exclude: ['react-pdf', 'pdfjs-dist', 'react-konva', 'konva'],
    include: ['react', 'react-dom'],
  },
});
