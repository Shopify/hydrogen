import {test, expect} from '@playwright/test';

test.describe('Dev Server - No Dependency Errors', () => {
  test('should not have useContext or GraphQL client errors on initial load', async ({page}) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor for page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    // Navigate to the home page (assumes server is already running on port 3000)
    await page.goto('http://localhost:3000/');

    // Verify page loaded successfully
    const title = await page.title();
    expect(title).toContain('Hydrogen');

    // Check that basic elements are visible
    const featuredCollection = page.locator('.featured-collection').first();
    await expect(featuredCollection).toBeVisible();

    // Check for specific errors we're trying to prevent
    const hasUseContextError = consoleErrors.some(error => 
      error.includes('Cannot read properties of null (reading \'useContext\')') ||
      error.includes('Cannot read properties of null (reading \'replaceText\')')
    );

    const hasGraphQLError = consoleErrors.some(error => 
      error.includes('Failed to resolve dependency: @shopify/graphql-client') ||
      error.includes('Failed to resolve dependency: use-resize-observer')
    );

    // Assertions
    expect(hasUseContextError).toBe(false);
    expect(hasGraphQLError).toBe(false);
  });

  test('should not have errors after page reload', async ({page}) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto('http://localhost:3000/');
    
    // Reload the page
    await page.reload();
    
    // Verify page still works after reload
    const featuredCollection = page.locator('.featured-collection').first();
    await expect(featuredCollection).toBeVisible();

    // Check for errors
    const hasUseContextError = consoleErrors.some(error => 
      error.includes('Cannot read properties of null (reading \'useContext\')') ||
      error.includes('Cannot read properties of null (reading \'replaceText\')')
    );

    const hasGraphQLError = consoleErrors.some(error => 
      error.includes('Failed to resolve dependency: @shopify/graphql-client') ||
      error.includes('Failed to resolve dependency: use-resize-observer')
    );

    expect(hasUseContextError).toBe(false);
    expect(hasGraphQLError).toBe(false);
  });
});