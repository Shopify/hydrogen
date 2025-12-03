import {defineConfig} from '@playwright/test';

export default defineConfig<{getUrl: () => string}>({
  globalSetup: require.resolve('./e2e/global-setup.mjs'),
  testMatch: /\.spec\.ts$/,
  retries: 0,
  reporter: 'list',
  projects: [
    {
      name: 'smoke',
      testDir: './e2e/smoke',
    },
    {
      name: 'cookies',
      testDir: './e2e/cookies',
    },
  ],
});
