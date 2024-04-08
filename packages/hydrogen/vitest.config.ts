import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      all: true,
      include: ['src/**'],
      exclude: ['src/vite/virtual-routes/**'],
    },
  },
});
