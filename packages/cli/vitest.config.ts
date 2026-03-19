import {configDefaults, defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './vitest.setup.ts',
    exclude: [
      ...configDefaults.exclude,
      '**/*-e2e.test.ts', // E2E tests require full git history; run in dedicated workflows
    ],
    coverage: {
      provider: 'v8',
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
