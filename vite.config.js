import { defineConfig } from 'vite';

export default defineConfig({
  base: '/RV-JEWELLS/',
  publicDir: false,
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  }
});
