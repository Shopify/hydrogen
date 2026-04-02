import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

// GraphiQL loads React 19, Monaco, GraphQL, and Explorer plugins via ESM from esm.sh CDN.
// First load can take 10-15s — use explicit 30s timeouts on initial load assertions.
// CDN availability is the primary flakiness vector for these tests.
const GRAPHIQL_LOAD_TIMEOUT_IN_MS = 30_000;

// Known third-party console noise from CDN-loaded libraries.
// These are expected dev-mode warnings that do not indicate Hydrogen bugs.
const KNOWN_NOISE_PATTERNS = [
  /Download the React DevTools/i,
  /react\.dev\/link\/react-devtools/i,
  /Warning:/,
];

function isKnownNoise(message: string): boolean {
  return KNOWN_NOISE_PATTERNS.some((pattern) => pattern.test(message));
}

test.describe('GraphiQL', () => {
  test('loads and displays the GraphiQL editor', async ({page}) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        (msg.type() === 'error' || msg.type() === 'warning') &&
        !isKnownNoise(msg.text())
      ) {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto('/graphiql');
    expect(response?.status()).not.toBe(500);

    // "Storefront API" is rendered by the custom logo component (graphiql.ts:371).
    // Waiting for it confirms React app rendered, not just the "Loading GraphiQL..." placeholder.
    await expect(page.getByText('Storefront API')).toBeVisible({
      timeout: GRAPHIQL_LOAD_TIMEOUT_IN_MS,
    });

    // This button has label='Toggle between different API schemas' set in Hydrogen source
    // (graphiql.ts:320). It is defined by Hydrogen, not the third-party GraphiQL library.
    await expect(
      page.getByRole('button', {
        name: /Toggle between different API schemas/i,
      }),
    ).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('executes the default shop query successfully', async ({page}) => {
    await page.goto('/graphiql');

    // Wait for full load before attempting to execute
    await expect(page.getByText('Storefront API')).toBeVisible({
      timeout: GRAPHIQL_LOAD_TIMEOUT_IN_MS,
    });

    // The execute button uses a CSS class from the GraphiQL third-party library
    // (loaded via ESM from esm.sh). Its aria-label is library-defined, not Hydrogen-defined.
    // .graphiql-execute-button is the stable selector for this third-party component.
    await page.locator('.graphiql-execute-button').click();

    // Scope assertion to the GraphiQL response panel.
    // CSS selector justified: GraphiQL uses identical semantic roles for editor and response panels;
    // .graphiql-response is the only stable way to distinguish the response area.
    await expect(
      page.locator('.graphiql-response').getByText('"shop"'),
    ).toBeVisible({timeout: GRAPHIQL_LOAD_TIMEOUT_IN_MS});
  });
});
