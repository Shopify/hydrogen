import {defineConfig} from '@playwright/test';

export default defineConfig({
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
