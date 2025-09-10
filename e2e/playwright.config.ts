import {defineConfig} from '@playwright/test';

export default defineConfig({
  // Base URL for all tests
  use: {
    baseURL: 'http://localhost:3000',
  },

  // No retries for now
  retries: 0,

  // Use list reporter for clear output
  reporter: 'list',

  // Automatically start dev server before tests
  webServer: {
    command: 'cd templates/skeleton && npm run dev',
    url: 'http://localhost:3000',
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
