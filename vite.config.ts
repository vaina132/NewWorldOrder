import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@systems': path.resolve(__dirname, 'src/systems'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@scenes': path.resolve(__dirname, 'src/scenes'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@rendering': path.resolve(__dirname, 'src/rendering'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    sourcemap: true,
  },
});
