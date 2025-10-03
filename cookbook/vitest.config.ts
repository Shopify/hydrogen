import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    coverage: {
      include: ['src/**'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
