import {test, expect, setTestStore} from '../../fixtures';

setTestStore('hydrogenPreviewStorefront');

// Known pre-existing console errors that are not caused by our code.
// These should be fixed in separate issues; suppressed here to keep the test focused
// on regressions introduced by our changes.
const KNOWN_NOISE_PATTERNS = [
  // flame-chart-js loads via unpkg CDN and may emit error-level messages.
  /flame-chart/i,
  /unpkg\.com/i,
  // styles.css uses data URI SVGs for decorative link icons (main a::after,
  // .Banner.ErrorBanner a::after). The skeleton app's CSP does not allow data: URIs
  // in img-src (it falls back to default-src which excludes data:), so the browser
  // blocks these CSS content: url("data:...") loads and logs a CSP violation.
  // Fix: extract the inline SVGs to external files.
  /Content Security Policy/i,
  // The virtual route Layout exports a full <html>/<head>/<body> document tree, but
  // when React Router mounts it inside the skeleton's root Layout, the two HTML-level
  // layouts conflict during client-side hydration. React 19 logs these as console.error.
  // Fix: reconcile the virtual route layout with the skeleton's layout mechanism.
  /Hydration failed/i,
  /An error occurred during hydration/i,
  /Expected server HTML to contain/i,
  /validateDOMNesting/i,
];

function isKnownNoise(message: string): boolean {
  return KNOWN_NOISE_PATTERNS.some((pattern) => pattern.test(message));
}

test.describe('Subrequest Profiler', () => {
  test('loads and displays the profiler UI', async ({page}) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isKnownNoise(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto('/subrequest-profiler');
    expect(response?.status()).not.toBe(500);

    await expect(
      page.getByRole('heading', {level: 1, name: 'Subrequest Profiler'}),
    ).toBeVisible();
    await expect(page.getByText('Development')).toBeVisible();
    await expect(page.getByText('Navigate to your app')).toBeVisible();

    // "Open app" is a Link element — valid HTML after removing the invalid
    // <Link><button> nesting that previously existed (subrequest-profiler.tsx:135)
    await expect(page.getByRole('link', {name: 'Open app'})).toBeVisible();

    await expect(page.getByRole('button', {name: /Clear/i})).toBeVisible();
    await expect(
      page.getByRole('checkbox', {name: /Hide cache update requests/i}),
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox', {name: /Preserve Log/i}),
    ).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('populates request data after navigating to the app', async ({
    page,
    context,
  }) => {
    await page.goto('/subrequest-profiler');

    // Wait for empty state first — confirms profiler UI and EventSource (SSE)
    // are initialized before we trigger any requests
    await expect(page.getByText('Navigate to your app')).toBeVisible();

    // Open a second tab to trigger Storefront API requests through the dev server
    const appPage = await context.newPage();
    await appPage.goto('/');
    await appPage.waitForLoadState('networkidle');

    // Switch back to the profiler to observe captured requests
    await page.bringToFront();

    // SSE event propagation through the dev server requires a generous timeout.
    // The empty state disappears once the first request is captured.
    await expect(page.getByText('Navigate to your app')).not.toBeVisible({
      timeout: 20_000,
    });

    // Footer text format: "{n} request(s) | {m} sub request(s)" (RequestTable.tsx:101-103)
    await expect(
      page.locator('#request-table__footer').filter({hasText: /\d+ request/}),
    ).toBeVisible();
  });

  test('notification banner can be dismissed', async ({page}) => {
    await page.goto('/subrequest-profiler');

    await expect(page.getByText(/Disable Cache/i)).toBeVisible();

    // The close button has aria-label="Close notification" (subrequest-profiler.tsx).
    // The skeleton app also has "Close" buttons for Cart/Search/Menu drawers,
    // so the selector must use the full label to avoid strict-mode ambiguity.
    await page.getByRole('button', {name: 'Close notification'}).click();

    await expect(page.getByText(/Disable Cache/i)).not.toBeVisible();
  });
});
