import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      all: true,
      include: ['src/**'],
      exclude: ['src/vite/virtual-routes/**'],
    },
  },
});
