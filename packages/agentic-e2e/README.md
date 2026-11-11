# Agentic E2E

At this stage, `agentic-e2e` asks the Storefront API of one storefront which country and language are active, pins one eligible product variant, opens the product page of that variant in a headless browser that it owns, asks one AI agent to add exactly 1 unit of that variant to the cart, prints one JSON result line, and closes the browser.

```sh
pnpm build:pkgs   # once: the command imports the built output of @shopify/hydrogen
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example
```

The URL must be the storefront root URL. A URL with a path, such as `/en-ca`, is a usage error.

**This is not a storefront test.** `agent-completed` means only that the agent says it added the item. Nothing checks the cart, the storefront, or the page state.

Run `pnpm --filter @shopify/agentic-e2e run browser:install` once before the first run. It downloads the Chromium build that matches this package's Playwright version (about 340 MB) into Playwright's shared cache. To use another Chromium-based browser, set `AGENTIC_E2E_BROWSER_PATH` to its executable.

## What it does

1. Checks that `SHOPIFY_PROXY_KEY` is set. If not, it stops before any Storefront API request and before the browser starts.
2. Sends one Storefront API query for the active country, language, and currency (see [Country and language](#country-and-language)).
3. Pins one variant in that country and language (see [Pinned variant](#pinned-variant)). If no variant is eligible, the result is `skipped` and no browser starts.
4. Starts Chromium with a fresh temporary profile.
5. Attaches one [Stagehand](https://github.com/browserbase/stagehand) agent to the browser, before the first navigation.
6. Loads the product page of the pinned variant and waits until the page has visible content.
7. Gives the agent one task: shop in the country and currency of the run (see [Country and language](#country-and-language)), select the variant options of the pinned variant (store strings are JSON-quoted and labelled as data), add exactly 1 unit to the cart, stop as soon as it is added, not open the cart or go to checkout, and not enter personal, shipping, or payment information. A short guest-shopper system prompt tells it how to handle cookie banners and dialogs, and to keep the country, language, and currency of the store unless the task asks for a change. The agent has at most 20 steps and 180 seconds. The URL navigation and web search tools are removed.
8. Disconnects Stagehand from the browser, then removes the browser process and the profile.

**Checkout and account pages are not blocked at this stage.** The agent is only told not to go there. Nothing stops it if it does not obey.

## Storefront API

Both queries go to the Storefront API at the origin of the URL (`<origin>/api/<version>/graphql.json`), with the default API version of `@shopify/hydrogen`. They use Hydrogen's public Storefront API client. Pass the final storefront origin: the command does not follow redirects, the same as Hydrogen's Storefront client, so an origin that redirects gives `indeterminate`. The command sends no access token, no cookies, and no buyer-IP header. A proxy at the storefront origin can add its own buyer-IP header, so the answer can depend on where the command runs. Each request has a 10-second deadline. An interrupt (SIGINT, SIGTERM, or SIGHUP) also stops a request.

### Country and language

The country, language, country name, and currency come from this query, sent without `@inContext`:

```graphql
localization { language { isoCode } country { isoCode name currency { isoCode } } }
```

Without `@inContext`, the Storefront API answers with the primary market of the shop. This is the market of the run. When the query fails or a field is missing, the result is `indeterminate`. There is no default country or language.

The browser can show another market, for example because the storefront selects the market from the geo-IP of the browser. The command sets no cookie and does not change the page. Instead, the task tells the agent to shop in the store of the country name, with prices in the currency, and to switch to that country through the country selector of the store if the store shows another country or currency. The country name and the currency are JSON-quoted as store data. A store without a country selector cannot be switched: the run then most likely ends without a confirmed completion. The command does not verify the market that the browser shows.

### Pinned variant

The catalog query sends the discovered country and language with `@inContext`. It reads products that are available for sale, in product ID order, 50 products per page, for at most 5 pages. For each product it reads one variant: `selectedOrFirstAvailableVariant`. The pinned variant is the variant of the first product that does not require a selling plan and whose variant is present and available for sale.

Limits:

- Only one variant per product is examined. A product whose first available variant is not eligible is passed over, even when another of its variants is eligible.
- A catalog with no eligible variant in the first 5 pages gives `skipped`.

The product page is `/products/<handle>` on the origin of the URL. The query and the hash of the URL are removed.

## Model

There is one model path: `anthropic/claude-haiku-5-5` through the Shopify AI proxy (`https://proxy.shopify.ai/apis/anthropic/v1`). The key comes from `SHOPIFY_PROXY_KEY` only. Each request has the header `Shopify-Usage-Tag: agentic-e2e`. No other key or endpoint is used.

The command does not print or store the key. It turns off Stagehand's own logs, and it removes `BROWSERBASE_CONFIG_DIR` and `BROWSERBASE_FLOW_LOGS` from its environment, because these turn on Stagehand session logs that are not redacted.

## Result

The result goes to stdout. Diagnostics go to stderr.

```json
{"status":"agent-completed","url":"https://your-storefront.example/products/snowboard","title":"Snowboard","summary":"I added 1 unit to the cart.","context":{"country":"US","language":"EN","countryName":"United States","currency":"USD"},"pinned":{"productHandle":"snowboard","productTitle":"Snowboard","variantId":"gid://shopify/ProductVariant/1","selectedOptions":[{"name":"Title","value":"Default Title"}]}}
{"status":"skipped","reason":"No eligible variant: the catalog was searched to the end.","context":{"country":"US","language":"EN","countryName":"United States","currency":"USD"}}
{"status":"indeterminate","reason":"HTTP 500"}
```

`agent-completed` requires that the agent recorded a `done` action with `taskCompleted: true`, and that Stagehand released the browser. It does not mean that the item is in the cart: nothing checks the cart. `url` is the page URL when the agent finished.

`skipped` means that no eligible variant was found. The reason tells whether the catalog was searched to the end or the 5-page limit was reached. No browser starts.

`indeterminate` means one of these: `SHOPIFY_PROXY_KEY` is not set; a Storefront API error, GraphQL errors, invalid response data, a malformed Storefront API response (catalog pagination returned no cursor), or a Storefront API deadline; a browser that failed to start (for example, Chromium is not installed), a navigation error, an HTTP status of 400 or higher on the product page, a page that does not show content, the agent step limit, the agent deadline, an agent or model error, no confirmed completion, no confirmed Stagehand release, or an interrupt (SIGINT, SIGTERM, or SIGHUP). After a Storefront API failure, no browser starts.

## Exit codes

| Code | Meaning                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 0    | `agent-completed`                                                                                                    |
| 2    | `indeterminate`                                                                                                      |
| 3    | `skipped`                                                                                                            |
| 64   | Usage error: no URL, more than one argument, an unknown flag, an invalid URL, a URL that is not http(s), a URL with credentials, or a URL with a path other than `/`. No browser starts. |

## Development

The CLI runs from TypeScript source on Node 24 (type stripping). This package has no build step, but it imports the built output of `@shopify/hydrogen`. Build it first with `pnpm build:pkgs` (or `pnpm --filter @shopify/hydrogen build`).

```sh
pnpm --filter @shopify/agentic-e2e run browser:install
pnpm --filter @shopify/agentic-e2e test:unit
pnpm --filter @shopify/agentic-e2e test:integration
```

The unit tests run the real Hydrogen client with a fake `fetch`. The integration tests use one local HTTP server for the storefront pages and the Storefront API, and a local fake model endpoint that scripts the agent's clicks. They make no real model call and need no key.

The test script of `@shopify/hydrogen` rebuilds its `dist`, so do not run it at the same time as these tests. Turbo runs `@shopify/agentic-e2e#test` after `@shopify/hydrogen#test`.

`packages/storefront-e2e` is a separate package. This package does not change or use it.
