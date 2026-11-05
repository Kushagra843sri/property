import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
