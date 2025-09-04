import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/viewer/', // importante para servir estático em /viewer/*
  build: {
    outDir: 'dist', // garante que o build vá para dist/
    assetsDir: 'assets', // organiza assets em subdiretório
    rollupOptions: {
      output: {
        // Garante que os assets tenham nomes consistentes
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
