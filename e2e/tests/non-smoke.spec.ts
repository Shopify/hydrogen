import {test, expect} from '@playwright/test';

test.describe('Non-smoke tests', () => {
  test('this test should not run with e2e:smoke command', async ({page}) => {
    // This test should be skipped when running npm run e2e:smoke
    expect(true).toBe(true);
  });
});
