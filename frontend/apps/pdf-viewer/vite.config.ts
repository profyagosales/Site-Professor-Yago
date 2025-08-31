import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/viewer/',            // importante para servir estático em /viewer/*
  build: {
    outDir: path.resolve(__dirname, '../../dist/viewer'),
    emptyOutDir: false          // não limpar o dist do app principal
  }
});
