#!/usr/bin/env node
// Fails when an example cannot render storefront pages against mock.shop without secrets.
// Usage: node scripts/examples-mock-smoke.ts http://localhost:3000

import { shop } from "../examples/shared/config.ts";

// Matches both raw JSON and the HTML-escaped JSON in data attributes.
const QUOTE = `(?:"|&quot;|&#34;)`;
const MOCK_SHOP_ID_PATTERN = new RegExp(`${QUOTE}shopId${QUOTE}:\\s*${QUOTE}0${QUOTE}`);
const PRODUCT_LINK_PATTERN = /href="(\/products\/[^"?#]+)/;
const COLLECTION_PATH = "/collections/men";
const ERROR_PATTERNS = [/Internal Server Error/i, /is required\. Run "pnpm run examples:secrets/];
const STARTUP_TIMEOUT_MS = 60_000;
const STARTUP_POLL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 30_000;

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error("Usage: node scripts/examples-mock-smoke.ts <base-url>");

await waitForServer(baseUrl);

const failures: string[] = [];
await checkPage("/");
const collectionHtml = await checkPage(COLLECTION_PATH);
const productPath = collectionHtml.match(PRODUCT_LINK_PATTERN)?.[1];
if (productPath) {
  await checkPage(productPath);
} else {
  console.log(`✗ no product link on ${COLLECTION_PATH}`);
  failures.push(`${COLLECTION_PATH} product link`);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed in mock.shop mode.`);
  process.exit(1);
}

async function checkPage(pathname: string): Promise<string> {
  const url = new URL(pathname, baseUrl);
  const response = await fetch(url, {
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const html = await response.text();
  const problems = [
    response.status === 200 ? null : `HTTP ${response.status}`,
    MOCK_SHOP_ID_PATTERN.test(html) ? null : 'no "shopId":"0" Shopify script tag',
    html.includes(shop.shopId) ? `rendered the private store's shop ID ${shop.shopId}` : null,
    ...ERROR_PATTERNS.filter((pattern) => pattern.test(html)).map(
      (pattern) => `matched ${pattern}`,
    ),
  ].filter((problem) => problem !== null);

  console.log(
    `${problems.length ? "✗" : "✓"} ${url.href}${problems.length ? ` (${problems.join(", ")})` : ""}`,
  );
  if (problems.length) failures.push(url.href);
  return html;
}

async function waitForServer(url: string) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(STARTUP_POLL_MS * 5) });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, STARTUP_POLL_MS));
    }
  }
  throw new Error(`${url} did not respond within ${STARTUP_TIMEOUT_MS}ms`, { cause: lastError });
}
