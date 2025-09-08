import {test, expect} from '@playwright/test';
import {startServer} from '../helpers/server';

let serverConfig: {port: number; stop: () => Promise<void>} | null = null;

test.describe('Smoke tests', () => {
  test.beforeAll(async () => {
    serverConfig = await startServer();
  }, 90000);

  test.afterAll(async () => {
    if (serverConfig) {
      await serverConfig.stop();
    }
  });

  test('homepage loads with no console errors @smoke', async ({page}) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    const response = await page.goto(`http://localhost:${serverConfig!.port}/`);

    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Hydrogen/);

    expect(consoleErrors).toHaveLength(0);
  });
});
