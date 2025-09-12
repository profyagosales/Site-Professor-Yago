import { defineConfig } from 'vite';

// Resolver caminho manualmente sem depender de types node
const resolveSrc = new URL('./src', import.meta.url).pathname;
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
  '@': resolveSrc
    }
  },
  optimizeDeps: {
    include: ['react-pdf']
  },
  build: {
    commonjsOptions: {
      include: [/react-pdf/, /node_modules/]
    }
  }
});
