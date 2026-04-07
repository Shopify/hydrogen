import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 60000, // 60s timeout for tests that apply recipes (slow operations)
    coverage: {
      include: ['src/**'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
