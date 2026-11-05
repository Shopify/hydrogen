# Storefront E2E

This package has two independent tools:

1. A portable Playwright suite for an already-running Hydrogen storefront.
2. `storefront-e2e`, an agent-driven buyer CLI (Stage 1: `add-to-cart`).

## Scripted Playwright suite

```sh
STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
```

See docs/storefront-contract.md for the required storefront contract, diagnostics, checkout boundary, and operational assumptions.

## Agent-driven CLI

```sh
ANTHROPIC_API_KEY=... pnpm storefront-e2e https://your-storefront.example --country US --language EN --test add-to-cart
```

`add-to-cart` is the only scenario, and the default. The CLI runs from TypeScript source on Node 24 (type stripping). It calls the Storefront API through the workspace Hydrogen client, so build the workspace packages first (`pnpm run build:pkgs`).

### What the scenario does

1. **Open the storefront.** The test country and language come from the required `--country` and `--language` flags. They are not detected from or verified against the browser page, and the CLI does not set the market: it sends no market headers and sets no cookies. Use a storefront URL that serves the context that you want. One fresh browser session starts. Before the first navigation, the CLI attaches Stagehand to that browser as an observer, with no model config: it makes no model calls and needs no model credentials. Then code (not the agent) opens the storefront URL.
   - Stagehand is attached before any page loads because Stagehand 3.7.3 can miss cross-origin iframes that were already loaded when it attached. The same browser and Stagehand instance are used for the whole run: there is no reload, second browser, or extra page request.
   - A missing or invalid `--country` or `--language` is a usage error (exit 64) before any browser or model starts. The CLI does not guess a default.
   - If the page does not load, the result is `indeterminate`.
2. **Prepare.** The CLI queries the tokenless Storefront API (`/api/2026-10/graphql.json`) on the API origin, with an explicit `@inContext(country:, language:)`. The Hydrogen client fills the declared `$country` and `$language` variables from the configured context. It pins the first purchasable variant, in product ID order, whose product does not require a selling plan. The search is paginated and limited by `--catalog-pages`.
   - The API's effective country and language are not verified independently. The Storefront API is used to pin the product only, never to read the cart.
   - A fully searched catalog with no eligible variant gives `skipped`. The storefront page was opened, but no buyer starts and no model is called.
   - A search that stops at the page limit gives `indeterminate`, not `skipped`.
3. **Open the start page.** Code opens the pinned product page, `<storefront URL path>/products/<handle>`, in the same browser session. The path of the storefront URL is used as a base path, for example a locale prefix such as `/en-ca`.
   - HTTP 404 or 410 at that route, with no redirect, gives `fail`: the Storefront API lists the product in the run context, so the published product route is broken. The CLI never tries another product.
   - Another load error, or an error after a redirect, gives `indeterminate`. A redirect to a page that loads is not a failure.
4. **Act.** Only now does the CLI resolve the selected model config and start the buyer agent on the prepared Stagehand session. A model config error gives `indeterminate`. The buyer agent gets one objective: shop using the configured country and language (if the store asks, choose these values, and do not switch to another), select the pinned variant, add exactly 1 unit to the cart, then stop and report that it was added. The objective does not ask the buyer to open the cart or go to checkout; the cart is verified in code. The objective names no route. Product and option strings are JSON-quoted and labelled as data.
   - Before the primary action, the buyer handles blocking cookie banners, age gates, and dialogs through visible controls. It prefers rejecting optional cookies or necessary-only settings, using consent preferences when needed. After handling an overlay, it observes again and scrolls until the product control is visible and unobstructed. Missing UI confirmation alone does not permit another Add attempt; the cart is still verified in code.
   - Checkout stays blocked as a safety stop. If the buyer reaches a checkout navigation anyway, the browser blocks it, and the runner aborts the buyer synchronously at the first handoff. The runner always detaches the buyer before it reads the cart.
   - The buyer's close resolves once Stagehand's CDP connection is confirmed closed (`observer.context.close()`), so it can no longer drive the browser. If the SDK run is still pending after that (Stagehand 3.7.3 can finish its own final model call without the abort signal), a `buyer.cleanup-warning` evidence record is written (close does not wait for the write) and the verdict is kept. If the release is not confirmed within 2 seconds, close rejects and the result is `indeterminate`.
   - The buyer waits until the page is observable before its first screenshot and first model turn. After actions and before later model turns, it checks Stagehand's active page, which can be a new tab. Observable means that the document finished parsing and `<body>` is shown (not `display: none`, `visibility: hidden`, or opacity 0) and has child elements. Each wait has a 15-second limit; an abort ends it at once. The post-action wait runs before Stagehand takes its post-turn screenshot. The report saves that SDK image, with no second capture. If the wait fails, Stagehand can still capture the page as-is; the next model turn must pass its own readiness check or the buyer stops with an error. Like other early buyer stops, this gives `indeterminate` unless a checkout was already captured. Readiness does not mean that the page will stay unchanged. It does not wait for network idle or show that Stagehand has registered every iframe. Stagehand still takes its own tool and terminal snapshots.
   - The browser country and language are not monitored. A store page that shows or switches to another market does not stop the buyer; the cart JSON still decides. Region redirects are not handled.
5. **Assert.** With no top-level checkout handoff, the buyer is detached, and code reads the active cart of the same browser session with one `GET <root>cart.js`: the documented Shopify AJAX cart endpoint (Hydrogen serves it as `cart.json`). The pinned variant's quantity, summed across all cart lines, must be exactly 1. Other lines (for example an automatic gift) are allowed and reported in `details.lines` and `details.otherLines`. An empty cart is a cart with no pinned line. The verdict does not use page labels, DOM content, the page's cart summary, a cart ID, the Standard Action `getCart()`, or a Storefront API cart query. No Hydrogen analytics are used.
   - The request runs in the page, so the browser sends the session's own cookies. The CLI reads, parses, and sets no cookie and needs no cart ID. `<root>` is `window.Shopify.routes.root` when the page sets it, else the path of the storefront URL (for example `/en-ca/`), on the current page origin. A root that is not a same-origin path is refused (`indeterminate`). The request asks for no cache, follows no redirect, and is limited to 5 seconds, body included. There is no second endpoint, `/cart` page, or other fallback.
   - Only `items[].variant_id`, `items[].quantity`, and `item_count` are read. The cart token, note, attributes, and line properties never leave the page. A `variant_id` must be a positive safe integer or a decimal string, and becomes `gid://shopify/ProductVariant/<id>` for the comparison. A quantity must be a positive integer, and `item_count` a non-negative integer. `details.cart` records `source: "cart-json"`, the `endpoint` (origin and path, no query), `handoff`, and `itemCountConsistent` (`item_count` against the summed lines, a diagnostic only).
   - An HTTP error, a refused redirect, a network error, a timeout, an abort, a non-JSON body, or another shape gives `indeterminate` with `details.failure` `{ source: "cart-json", code }` (and `httpStatus` for HTTP errors), never `fail`. A driver with no cart reader, or a run that stopped at a blocked checkout (the page is then a browser error page), gives `indeterminate` with `code: "reader-unavailable"` and no cart read.
   - Proof of exactly 1 unit passes, whatever the buyer reported. A wrong cart (`details.cartCheck`: `variant-missing` or `wrong-quantity`) fails only after a confirmed add attempt: the buyer reported completion, after the buyer started, the browser recorded a Standard Event add of 1 unit of the pinned variant and its settled response (an add input alone, or a failed or unsettled request, does not count), or a checkout handoff was captured. Without one, the result is `indeterminate`, because a confused agent is not a storefront failure. The Stagehand buyer reports completion only when the agent recorded a `done` action with `taskCompleted: true`. Stagehand 3.7.3 can set `completed` without one (when its final assessment fails); that gives `failure.code: completion-unconfirmed` and confirms nothing.
   - If the browser recorded, after the buyer started, a pinned add whose settled result has cart `userErrors`, the storefront itself rejected the add. Then a cart that cannot be read for lack of a reader, or a cart without 1 unit, fails with `details.failure` `{ source: "storefront", code: "add-rejected" }`. Proof of 1 unit still passes. A failed request promise, a rejection of another variant, or a cart JSON read error is not a rejection.
   - Inconclusive results carry a small `details.failure` (`source` and `code`, and `httpStatus` for HTTP errors). Hydrogen errors, GraphQL errors, and invalid API data make the run indeterminate, not a storefront failure. Stagehand runtime failures are `{ source: "sdk", code: "unclassified" }`. A failed tool step in `buyer.step` evidence is `{ source: "action", code: "unclassified", delivery: "unknown" }`: no fault is assigned, because Stagehand 3.7.3 does not say why it failed or whether the action reached the page. No raw SDK text, URL, request body, or token is copied into these fields.
   - The browser records only the Standard Events that the scenario selects. The add-to-cart scenario selects `shopify:cart:lines-update` and `shopify:cart:error`, from the browser start. They confirm or reject an add attempt (above) and are diagnostics; they are never a cart reference. A storefront without Standard Events can still pass.
   - The cart JSON has no buyer country, so the cart country is not checked independently: `details.context` is `{ cartCountryConfirmed: false, countryVerification: "configured-only" }`. The browser country is not checked either. The currency is not used as a country check, and the routes root does not prove a country.

The run timeout applies to every step: driver load, browser start, storefront page, context read, catalog search, start page, buyer start, and buyer actions. A buyer that stopped early (abort, error, or step limit) is also detached before the cart is checked. If the runner cannot detach the buyer, the result is `indeterminate`, because the cart can still change.

### Known limitations

- The browser blocks every checkout navigation before the request leaves the browser, on any host. The first top-level checkout navigation is always captured, on any route, with its raw URL and a route shape. The captured URL is never parsed as a cart reference. Because the cart is not read from a blocked checkout error page, a run that reaches checkout gives `indeterminate`.
- Embedded checkout frames remain blocked, but do not stop the buyer or consume its first checkout handoff. Blocked requests record the frame type, redirect status, path, and actual query parameter names, including names that contain tokens. The route shape omits query values and the fragment.
- Attaching Stagehand before the first navigation lets it see cross-origin iframes, including nested iframes on a third site, in local tests. Under heavy CPU load, Stagehand sometimes never registers a nested third-site iframe; the page readiness wait does not change this. A frame chain that returns to the first origin (A→B→A) is a known separate Stagehand limitation. Frame support is limited to what Stagehand 3.7.3 provides, so a frame that the buyer cannot reach is not evidence of a storefront bug. This does not prove that every iframe works, or that a given model can use them.
- The run context is the configured `--country` and `--language`. No page value (such as `window.Shopify.country`, the browser language, the currency, or the route) is read or checked, so the CLI cannot show that the browser used that market.
- The cart is read right after the buyer is detached, while the browser session stays open but has no agent. A page request that was already in flight can still change the cart before the read.
- The cart JSON contract assumes that `<root>cart.js` returns the same active cart that the storefront UI uses for this browser session, as Liquid themes and Hydrogen do. A storefront whose cart lives elsewhere (a custom session, an app cart, or a headless setup that does not serve this route) is not supported: the read can give an HTTP error, or a cart that is not the UI cart. The CLI does not detect the second case.

### Verdicts and exit codes

| Verdict         | Exit | Meaning                                                                                                                          |
| --------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pass`          | 0    | The API-verified cart holds exactly 1 unit of the pinned variant.                                                                |
| `skipped`       | 0    | The catalog has no eligible variant in the run context.                                                                          |
| `fail`          | 1    | The pinned product route returned HTTP 404 or 410, or the API-verified cart is wrong after a confirmed add attempt.              |
| `indeterminate` | 2    | The run could not decide. The reason explains why.                                                                                 |
| usage error     | 64   | Invalid arguments.                                                                                                               |

`SIGINT`, `SIGTERM`, and `SIGHUP` stop the run gracefully: the CLI aborts the buyer, closes the browser and its temporary profile, and writes `result.json` (usually `indeterminate`, exit 2). A repeated signal does not force an exit; cleanup is bounded by the existing close and assertion deadlines. `SIGKILL` cannot be handled: it loses the result and can leave the browser and its profile behind.

If the buyer stops early (step limit, error, or timeout), the CLI still reads the session cart. Proof of 1 unit passes; other cart states follow the add-attempt rule above. The CLI never retries the model.

### Options

Run `pnpm storefront-e2e --help` for the full list.

- `--api-origin <origin>`: Storefront API origin. The default is the storefront URL origin. A value with a path, query, or credentials is rejected.
- `--country`, `--language`: Required test context, for example `--country US --language EN`. The catalog queries and the buyer objective use it. It is not detected or verified in the browser, and it does not set the market.
- `--max-steps`, `--timeout` (seconds), `--catalog-pages`: Integer limits. Values out of range are rejected.
- `--model <name>`: Buyer model, a Stagehand model name in the form `<provider>/<model>`. `STOREFRONT_E2E_MODEL` is the fallback, then the default `anthropic/claude-haiku-5-5`. See [Model and credentials](#model-and-credentials).
- `--executable-path <path>`: Browser executable.
- `--output <dir>`: Artifacts root.

### Model and credentials

The buyer gets an explicit model config: model name, API key, and an optional base URL and headers. It reads no credentials itself. Stagehand selects the provider SDK from the model name prefix. The CLI builds the config from the environment only when the buyer starts, after the catalog and product page checks pass. Stagehand is already attached to the browser at that point, but with no model config, so a run that stops earlier (for example `skipped`, or `fail` for a product route 404) needs no key and makes no model call. The first match is used:

| Key                      | Used for                 | Sent to                                                                                                                   |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `STOREFRONT_E2E_API_KEY` | Any provider             | `STOREFRONT_E2E_BASE_URL`. If it is not set: the official endpoint for `anthropic` and `openai`, else the provider SDK default. |
| `ANTHROPIC_API_KEY`      | `anthropic/*` models only | `ANTHROPIC_BASE_URL`, or `https://api.anthropic.com/v1`.                                                                  |
| `OPENAI_API_KEY`         | `openai/*` models only   | `OPENAI_BASE_URL`, or `https://api.openai.com/v1`.                                                                        |
| `SHOPIFY_PROXY_KEY`      | `anthropic/*` and `openai/*` models only | The Shopify AI proxy only: `https://proxy.shopify.ai/apis/anthropic/v1` or `https://proxy.shopify.ai/vendors/openai/v1`. |

- A key is never sent to a different provider. For example, `OPENAI_API_KEY` is not used for an `anthropic/*` model.
- `STOREFRONT_E2E_BASE_URL` is used only with `STOREFRONT_E2E_API_KEY`. If you set it without that key, the run stops. You are responsible for the pairing of the generic key and endpoint.
- Base URLs must use HTTPS. Plain HTTP is allowed only on `localhost`, `127.0.0.1`, and `[::1]`.
- Requests to `proxy.shopify.ai` include the header `Shopify-Usage-Tag: storefront-e2e`.
- An invalid model name, a missing key, an unsafe endpoint, or a provider that Stagehand does not support gives `indeterminate` with a reason. Error messages do not echo the values.

Examples:

```sh
# Default model (anthropic/claude-haiku-5-5) through the Shopify AI proxy
SHOPIFY_PROXY_KEY=... pnpm storefront-e2e https://your-storefront.example --country US --language EN

# Anthropic directly
ANTHROPIC_API_KEY=... pnpm storefront-e2e https://your-storefront.example --country US --language EN

# OpenAI directly
OPENAI_API_KEY=... pnpm storefront-e2e https://your-storefront.example --country US --language EN --model openai/gpt-4.1-mini

# Explicit generic key and endpoint
STOREFRONT_E2E_API_KEY=... STOREFRONT_E2E_BASE_URL=https://models.example/v1 \
  pnpm storefront-e2e https://your-storefront.example --country US --language EN --model openai/gpt-4.1-mini
```

Tests cover the `anthropic` and `openai` request paths against a local endpoint. Other Stagehand providers can work with `STOREFRONT_E2E_API_KEY`, but they are not validated. The buyer uses the provider SDK defaults for reasoning and thinking settings.

### Artifacts

Each run writes to a new directory `<root>/<runId>/`:

- `evidence.jsonl`: Standard Events, the configured `storefront-context`, buyer actions, and agent-reported friction, appended as they occur. Friction does not change the verdict.
- `result.json`: the final result, written also on timeout or error.
- Screenshots from the buyer steps.

`result.json` also records the context (`context.configured`, from the flags), the start page, the Node version, the git commit, the declared Stagehand and Playwright versions, and, when the buyer loaded, the model name and a SHA-256 hash of the buyer system prompt.

The default root is `packages/storefront-e2e/storefront-e2e-results/` (ignored by git), whatever the current directory. The root `pnpm storefront-e2e` script runs the package `cli` script, so the current directory is `packages/storefront-e2e/`. A relative `--output` path resolves from that directory.

### Private reports

Reports are private owner debug data. JSON, terminal output, and HTML keep URLs, query values, cart identifiers, and recorded event fields. The runner does not collect model credentials, authorization headers, or cookies as report fields. SDK error messages are saved unchanged and can contain sensitive provider text. Keys with line breaks are rejected. Error objects include only their name and message, not SDK request or response properties. Screenshots are not masked and can show page content.

Before it loads Stagehand, the CLI removes `BROWSERBASE_CONFIG_DIR` and `BROWSERBASE_FLOW_LOGS` from its own environment. Stagehand reads them when it loads, and they enable session logs that are not redacted.

### Tests

```sh
pnpm --filter @shopify/storefront-e2e test:unit         # every src/**/*.test.ts except integration tests; no browser or model
pnpm --filter @shopify/storefront-e2e test:integration  # every src/**/*.integration.test.ts: real headless browser against local fixtures; no external model calls and no real credentials
```
