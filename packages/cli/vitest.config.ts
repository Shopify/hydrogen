import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './vitest.setup.ts',
    coverage: {
      all: true,
      include: ['src/**'],
      exclude: [
        'src/create-app.*',
        'src/setup-assets/**',
        'src/virtual-routes/**',
      ],
    },
  },
});
