import { defineConfig } from 'vitest/config';

// Root suite covers the engine only; server/ and ui/ run their own suites.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
