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
ANTHROPIC_API_KEY=... pnpm storefront-e2e https://your-storefront.example --test add-to-cart
```

`add-to-cart` is the only scenario, and the default. The CLI runs from TypeScript source on Node 24 (type stripping). No build step is necessary.

### What the scenario does

1. **Resolve the context.** One fresh browser session starts. Before the first navigation, the CLI attaches Stagehand to that browser as an observer, with no model config: it makes no model calls and needs no model credentials. Then code (not the agent) opens the storefront URL and reads the country and language that the page shows (`window.Shopify.country` and `window.Shopify.locale`). This value is frozen as the only context of the run.
   - Stagehand is attached before any page loads because Stagehand 3.7.3 can miss cross-origin iframes that were already loaded when it attached. The same browser and Stagehand instance are used for the whole run: there is no reload, second browser, or extra page request.
   - Without `--country` and `--language`, both values come from the page.
   - A flag is a constraint, not a setting. If the page shows another value, the result is `indeterminate` (`errorKind: setup`) before any API query or buyer. The CLI does not set the market: it sends no market headers and sets no cookies. Use a storefront URL that serves the context that you want.
   - If the page does not load, the result is `indeterminate` (`errorKind: browser`). If the page shows no readable country or language, the result is `indeterminate` (`errorKind: setup`). The CLI does not guess a default.
2. **Prepare.** The CLI queries the tokenless Storefront API (`/api/2026-10/graphql.json`) on the API origin, with an explicit `@inContext(country:, language:)` for the frozen context. It pins the first purchasable variant, in product ID order, whose product does not require a selling plan. The search is paginated and limited by `--catalog-pages`.
   - Every response must report the same context in `extensions.context`. A missing or different context gives `indeterminate` (`errorKind: context`).
   - A fully searched catalog with no eligible variant gives `skipped`. The browser preflight ran, but no buyer starts and no model is called.
   - A search that stops at the page limit gives `indeterminate`, not `skipped`.
3. **Open the start page.** Code opens the pinned product page, `<storefront URL path>/products/<handle>`, in the same browser session. The path of the storefront URL is used as a base path, for example a locale prefix such as `/en-ca`.
   - HTTP 404 or 410 at that route, with no redirect, gives `fail`: the Storefront API lists the product in the run context, so the published product route is broken. The CLI never tries another product.
   - Another load error, or an error after a redirect, gives `indeterminate` (`errorKind: browser`). A redirect to a page that loads is not a failure.
   - Then code reads the page context again. A different context gives `indeterminate` (`errorKind: context`) and no buyer starts.
4. **Act.** Only now does the CLI resolve the selected model config and start the buyer agent on the prepared Stagehand session. A model config error gives `indeterminate` (`errorKind: setup`). The buyer agent gets one objective: keep the run country and language (if the store asks, choose these values), select the pinned variant, add exactly 1 unit to the cart, then stop and report that it was added. The objective does not ask the buyer to open the cart or go to checkout; the cart is verified in code. The objective names no route. Product and option strings are JSON-quoted and labelled as data.
   - Before the primary action, the buyer handles blocking cookie banners, age gates, and dialogs through visible controls. It prefers rejecting optional cookies or necessary-only settings, using consent preferences when needed. After handling an overlay, it observes again and scrolls until the product control is visible and unobstructed. Missing UI confirmation alone does not permit another Add attempt; the cart is still verified through the API.
   - Checkout stays blocked as a safety stop. If the buyer reaches a checkout navigation anyway, the browser blocks it, and the runner aborts the buyer synchronously at the first handoff. The runner always detaches the buyer before it reads the cart.
   - The buyer's close resolves once Stagehand's CDP connection is confirmed closed (`observer.context.close()`), so it can no longer drive the browser. If the SDK run is still pending after that (Stagehand 3.7.3 can finish its own final model call without the abort signal), a `buyer.cleanup-warning` evidence record is written (close does not wait for the write) and the verdict is kept. If the release is not confirmed within 2 seconds, close rejects and the result is `indeterminate`.
   - The buyer waits until the main page is observable at these points: before its first screenshot and first model turn, before each later model turn, and before each screenshot that it takes after an action. Observable means that the document finished parsing and `<body>` is shown (not `display: none`, `visibility: hidden`, or opacity 0) and has child elements. The limit is 15 seconds. If the page does not become observable, that model turn is not sent, and the buyer stops with an error. Like other early buyer stops, this gives `indeterminate` unless a checkout was already captured. An abort ends the wait at once. This check does not wait for network idle, and it does not show that Stagehand has registered every iframe. Stagehand still takes its own page snapshots inside its tools.
   - The browser records `storefront-locale` evidence for the main page when its context changes. If it differs from the frozen context, the runner aborts the buyer at once. The result is `indeterminate` (`errorKind: context`). The runner does not re-pin a product or re-select a context.
   - Code reads the page context before each checkpoint, and after a checkpoint that did not stop at checkout. After a blocked checkout, the page is a browser error page, so the last recorded context is used, and the cart query checks the API context.
5. **Assert.** Code finds a cart reference, then verifies that cart independently through the configured Storefront API only, in the frozen context. No key is needed. It reads all cart lines and `cart.buyerIdentity.countryCode`. The pinned variant's quantity, summed across all cart lines, must be exactly 1. Other lines (for example an automatic gift) are allowed and reported in `details.lines` and `details.otherLines`. The verdict does not use page labels, DOM content, or the page's cart summary. No Hydrogen analytics are used.
   - Tokens and keys are opaque. The CLI checks only URL syntax, never their characters or length, and sends the cart ID to the API unchanged.
   - With no top-level checkout handoff, the buyer is detached and code asks the live page for its active cart with the read-only Shopify Standard Action `window.Shopify.actions.getCart(payload?, options?)`, after `DOMContentLoaded`, with a 5 second limit. It passes no payload (so no cart is selected) and only `options.signal`. The returned `cart.id` is the primary reference. The cart-reference reader does not read the DOM, parse cookies, or use cart summary values, and it calls no other action. The ID stays in memory and is redacted. `{ cart: null }` is never replaced by an older ID: it fails (`details.cartCheck: no-current-cart`) after a confirmed add attempt, and is `indeterminate` otherwise. An action that throws, returns another shape, or does not settle gives `indeterminate` (`errorKind: browser`). A page without the action uses the Standard Event cart ID below. The action is not read after a blocked top-level checkout, because the page is then a browser error page. Then the captured checkout URL is the reference: code reads the cart token from `/cart/c/<token>`, `/checkouts/(cn|co)/<token>/...`, or `/checkout/<shop>/(cn|co)/<token>/...` (with an optional locale prefix) and queries `gid://shopify/Cart/<token>`.
   - API proof of exactly 1 unit passes, whatever the buyer reported. A wrong cart (`details.cartCheck`: `variant-missing` or `wrong-quantity`), or an API `cart: null` for the current cart ID that the page reported (`cart-missing`), fails only after a confirmed add attempt: the buyer reported completion, after the buyer started, the browser recorded a Standard Event add of 1 unit of the pinned variant and its settled response (an add input alone, or a failed or unsettled request, does not count), or a checkout handoff was captured. Without one, the result is `indeterminate` (`errorKind: buyer`), because a confused agent is not a storefront failure. A cart ID alone confirms nothing. The Stagehand buyer reports completion only when the agent recorded a `done` action with `taskCompleted: true`. Stagehand 3.7.3 can set `completed` without one (when its final assessment fails); that gives `failure.code: completion-unconfirmed` and confirms nothing.
   - If the browser recorded, after the buyer started, a pinned add whose settled result has cart `userErrors`, the storefront itself rejected the add. Then a missing cart reference, a missing cart, or a cart without 1 unit fails with `details.failure` `{ source: "storefront", code: "add-rejected" }`. API proof of 1 unit still passes. A failed request promise, a rejection of another variant, or a Storefront API error is not a rejection. `details.checkout.handoff` records whether a handoff was captured.
   - Inconclusive results carry a small `details.failure` (`source` and `code`, and `httpStatus` for HTTP errors). Storefront API errors are named `aborted`, `timeout`, `network`, `http-status`, `invalid-json`, `graphql`, `invalid-response`, or `context`. They are never a storefront failure. Stagehand runtime failures are `{ source: "sdk", code: "unclassified" }`. A failed tool step in `buyer.step` evidence is `{ source: "action", code: "unclassified", delivery: "unknown" }`: no fault is assigned, because Stagehand 3.7.3 does not say why it failed or whether the action reached the page. No raw SDK text, URL, request body, or token is copied into these fields.
   - A cart ID from a Standard Event (`shopify:cart:lines-update` settled with no user errors, or `shopify:cart:view`) before the handoff is optional evidence. With a captured handoff, it is read only when the URL has no readable reference or its cart is not found, so there are at most two cart reads. With no handoff and no page cart action, the latest such ID is read. A storefront without Standard Events can still pass.
   - The captured URL must reference the API cart: its token must equal the token of the API cart ID or of the API `checkoutUrl`. A native route and a cart permalink for the same cart are equivalent. Query parameters, including `key`, are not cart identity. Cart keys can differ between API responses. `details.checkout.exactApiQuery` records whether the API query values match, as a diagnostic only.
   - A set buyer identity country overrides the `@inContext` country for the cart. If it differs from the run country, the result is `indeterminate` (`errorKind: context`), not `fail`.
   - If it is null, the cart country is not independently confirmed. The cart checks still apply, and `details.context.cartCountryConfirmed` is `false`. The currency is not used as a country check.
   - The query language applies to the API read only. The CLI does not claim the checkout language.

The run timeout applies to every step: driver load, browser start, storefront page, context read, catalog search, start page, buyer start, and buyer actions. A buyer that stopped early (abort, error, or step limit) is also detached before the cart is checked. If the runner cannot detach the buyer, the result is `indeterminate`, because the cart can still change.

### Known limitations

- The browser blocks every checkout navigation before the request leaves the browser, on any host. The first top-level checkout navigation is always captured, also when it has no readable cart reference. The captured URL is only a candidate. The checkout host is not checked: a custom domain, a sibling host, or a Shop wrapper is treated the same as the storefront host. The cart identity in the URL and the cart contents read through the configured Storefront API decide the outcome. The captured and API checkout origins are recorded as diagnostics only. The CLI makes no other claim about a checkout host. A URL that does not reference the API cart gives `indeterminate`. A capture with no cart reference and no Standard Event cart ID gives `indeterminate` with `errorKind: browser`.
- Embedded checkout frames remain blocked, but do not stop the buyer or consume its first checkout handoff. Blocked requests record the frame type, redirect status, masked route, and query parameter names; tokens and query values are not recorded.
- Attaching Stagehand before the first navigation lets it see cross-origin iframes, including nested iframes on a third site, in local tests. Under heavy CPU load, Stagehand sometimes never registers a nested third-site iframe; the page readiness wait does not change this. A frame chain that returns to the first origin (A→B→A) is a known separate Stagehand limitation. Frame support is limited to what Stagehand 3.7.3 provides, so a frame that the buyer cannot reach is not evidence of a storefront bug. This does not prove that every iframe works, or that a given model can use them.
- The context comes from the public `window.Shopify` globals of the storefront page. A storefront URL that does not set them gives `indeterminate` (`errorKind: setup`).
- A later page (for example the product page) that answers but sets neither `window.Shopify.country` nor a locale does not stop the run: the frozen context is carried forward as an assumption, not a confirmation. It is recorded as a runner observation with `verification: "carried-forward"` and a `storefront-locale-carried-forward` evidence record, never as an observed locale. A partial value (for example only country `CA`), an invalid value, a page that does not answer or closes, or a known different locale still gives `indeterminate` (`errorKind: context`). Storefront API queries and the cart country check still use the frozen context.
- When a checkout handoff is captured, the verdict uses the first one only. With or without a handoff, the cart is read right after the buyer is detached, while the browser session stays open but has no agent. A page request that was already in flight can still change the cart before the read.

### Verdicts and exit codes

| Verdict         | Exit | Meaning                                                                                                                          |
| --------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pass`          | 0    | The API-verified cart holds exactly 1 unit of the pinned variant.                                                                |
| `skipped`       | 0    | The catalog has no eligible variant in the run context.                                                                          |
| `fail`          | 1    | The pinned product route returned HTTP 404 or 410, or the API-verified cart is wrong after a confirmed add attempt.              |
| `indeterminate` | 2    | The run could not decide. `errorKind` tells why: `setup`, `api`, `browser`, `buyer`, `context`, `timeout`, or `internal`.        |
| usage error     | 64   | Invalid arguments.                                                                                                               |

`SIGINT`, `SIGTERM`, and `SIGHUP` stop the run gracefully: the CLI aborts the buyer, closes the browser and its temporary profile, and writes `result.json` (usually `indeterminate`, exit 2). A repeated signal does not force an exit; cleanup is bounded by the existing close and assertion deadlines. `SIGKILL` cannot be handled: it loses the result and can leave the browser and its profile behind.

If the buyer stops early (step limit, error, or timeout), the CLI still checks the cart through the API. API proof of 1 unit passes; other cart states follow the add-attempt rule above. The CLI never retries the model.

### Options

Run `pnpm storefront-e2e --help` for the full list.

- `--api-origin <origin>`: Storefront API origin. The default is the storefront URL origin. A value with a path, query, or credentials is rejected.
- `--country`, `--language`: Optional expected storefront context. They do not set the market. See [What the scenario does](#what-the-scenario-does).
- `--max-steps`, `--timeout` (seconds), `--catalog-pages`: Integer limits. Values out of range are rejected.
- `--model <name>`: Buyer model, a Stagehand model name in the form `<provider>/<model>`. `STOREFRONT_E2E_MODEL` is the fallback, then the default `anthropic/claude-haiku-5-5`. See [Model and credentials](#model-and-credentials).
- `--executable-path <path>`: Browser executable.
- `--output <dir>`: Artifacts root.

### Model and credentials

The buyer gets an explicit model config: model name, API key, and an optional base URL and headers. It reads no credentials itself. Stagehand selects the provider SDK from the model name prefix. The CLI builds the config from the environment only when the buyer starts, after the context, catalog, and product page checks pass. Stagehand is already attached to the browser at that point, but with no model config, so a run that stops earlier (for example `skipped`, or `fail` for a product route 404) needs no key and makes no model call. The first match is used:

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
- An invalid model name, a missing key, an unsafe endpoint, or a provider that Stagehand does not support gives `indeterminate` with `errorKind: setup`. Error messages do not echo the values.

Examples:

```sh
# Default model (anthropic/claude-haiku-5-5) through the Shopify AI proxy
SHOPIFY_PROXY_KEY=... pnpm storefront-e2e https://your-storefront.example

# Anthropic directly
ANTHROPIC_API_KEY=... pnpm storefront-e2e https://your-storefront.example

# OpenAI directly
OPENAI_API_KEY=... pnpm storefront-e2e https://your-storefront.example --model openai/gpt-4.1-mini

# Explicit generic key and endpoint
STOREFRONT_E2E_API_KEY=... STOREFRONT_E2E_BASE_URL=https://models.example/v1 \
  pnpm storefront-e2e https://your-storefront.example --model openai/gpt-4.1-mini
```

Tests cover the `anthropic` and `openai` request paths against a local endpoint. Other Stagehand providers can work with `STOREFRONT_E2E_API_KEY`, but they are not validated. The buyer uses the provider SDK defaults for reasoning and thinking settings.

### Artifacts

Each run writes to a new directory `<root>/<runId>/`:

- `evidence.jsonl`: Standard Events, `storefront-locale` observations, the frozen `storefront-context`, buyer actions, and agent-reported friction, appended as they occur. Friction does not change the verdict.
- `result.json`: the final result, written also on timeout or error.
- Screenshots from the buyer steps.

`result.json` also records the context (`context.requested` from the flags, `context.resolved`, the browser and runner country and language observations, and any mismatch), the start page, the Node version, the git commit, the declared Stagehand and Playwright versions, and, when the buyer loaded, the model name and a SHA-256 hash of the buyer system prompt.

The default root is `packages/storefront-e2e/storefront-e2e-results/` (ignored by git), whatever the current directory. The root `pnpm storefront-e2e` script runs the package `cli` script, so the current directory is `packages/storefront-e2e/`. A relative `--output` path resolves from that directory.

### HTML report

```sh
pnpm storefront-e2e:report                                  # reads storefront-e2e-results/live, writes live/index.html
pnpm storefront-e2e:report --input <artifact-root> --output <file.html>
```

The command searches the input directory for run directories with a `result.json`, and reads only `result.json`, the `evidence.jsonl` next to it, and `step-NNN.png` screenshots. It changes no artifact, and it starts no browser, server, or model. It prints the HTML path and a `file://` URL. Open the file in a browser; it needs no server.

- The newest run for each storefront URL and scenario is the latest run. Totals count latest runs only. Older runs stay in the report as history.
- Verdicts, reasons, and `errorKind` come from `result.json` unchanged. `indeterminate` means the harness could not prove a result. It is not a storefront failure.
- The timeline shows only recorded evidence: buyer actions, the agent explanations and final answer that the agent wrote, friction reports, blocked navigation, and Standard Events. It does not contain hidden model reasoning.
- Missing files, invalid lines, and missing screenshots become warnings in the report. The report does not follow symlinks, and it ignores paths written inside `result.json`.
- Strings go through the same redactor as the CLI, with the model key variables registered.
- Relative paths resolve from `packages/storefront-e2e/`. The output must end in `.html`, and an existing symlink at the output path is refused.

### Secrets

The CLI redacts cart tokens, cart keys, checkout tokens, URL query values, authorization headers, and the values of all model key variables (`STOREFRONT_E2E_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SHOPIFY_PROXY_KEY`) before it writes to disk or to the terminal. For a checkout URL of any shape, the full URL and every private path segment, query value, and unknown query name are redacted. The `id` of every `cart` object (for example in Standard Events) is redacted, for any ID format. Raw checkout URLs and cart IDs stay in memory only; the checkout host and the masked route stay visible. Reports record the model name, never credentials. Screenshots can show page content.

Before it loads Stagehand, the CLI removes `BROWSERBASE_CONFIG_DIR` and `BROWSERBASE_FLOW_LOGS` from its own environment. Stagehand reads them when it loads, and they enable session logs that are not redacted.

### Tests

```sh
pnpm --filter @shopify/storefront-e2e test:unit         # every src/**/*.test.ts except integration tests; no browser or model
pnpm --filter @shopify/storefront-e2e test:integration  # every src/**/*.integration.test.ts: real headless browser against local fixtures; no external model calls and no real credentials
```
