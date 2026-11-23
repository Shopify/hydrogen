#!/usr/bin/env node
// Fails when an example cannot render storefront pages against mock.shop without secrets.
// Usage: node scripts/examples-mock-smoke.ts http://localhost:3000

import { shop } from "../examples/shared/config.ts";

// Matches both raw JSON and the HTML-escaped JSON in data attributes.
const QUOTE = `(?:"|&quot;|&#34;)`;
const MOCK_SHOP_ID_PATTERN = new RegExp(`${QUOTE}shopId${QUOTE}:\\s*${QUOTE}0${QUOTE}`);
const PAGES = ["/", "/collections/men", "/products/slides"];
const ERROR_PATTERNS = [/Internal Server Error/i, /is required\. Run "pnpm run examples:secrets/];

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error("Usage: node scripts/examples-mock-smoke.ts <base-url>");

const failures: string[] = [];
for (const pathname of PAGES) {
  const url = new URL(pathname, baseUrl);
  const response = await fetch(url, { headers: { accept: "text/html" } });
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
}

if (failures.length) {
  console.error(`\n${failures.length} page(s) failed in mock.shop mode.`);
  process.exit(1);
}
