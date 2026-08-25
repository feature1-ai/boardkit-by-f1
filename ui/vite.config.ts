import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// The demo imports the engine SOURCE directly (no build step needed) via the
// @boardkit alias. Only browser-safe modules are imported — JsonFileStore
// (node:fs) stays out of the browser bundle.
export default defineConfig({
  plugins: [vue()],
  build: { target: 'esnext' }, // top-level await in main.ts

  resolve: {
    alias: {
      '@boardkit': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },
});
