import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  base: '/viewer/',
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
});
