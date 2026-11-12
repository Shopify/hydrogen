# Agentic E2E

`agentic-e2e` checks that an AI agent can add one product to the cart of a storefront through its UI. Each run executes one test (see [Tests](#tests)). It pins one product variant through the Storefront API, opens the product page of that variant in a headless browser that it owns, and asks one AI agent to add exactly 1 unit of that variant to the cart. Code, not the agent, then decides the result from Shopify Standard Events. Only when there is no add event, the code also uses whether the agent confirmed that it completed the task. **The command does not read the cart:** `pass` means that the storefront's one add event resolved with a cart and without cart user errors or stock or availability warnings, not that the cart was checked. The command prints one JSON result line and closes the browser.

**Supported storefronts:** only storefronts that dispatch the `shopify:cart:lines-update` Standard Event with a `promise` (Hydrogen storefronts do). A storefront that does not dispatch it, for example a Liquid theme without Standard Events, is out of scope: the result is `fail` when the agent reports that it added the item, and `indeterminate` when it does not, even when the item reaches the cart.

```sh
pnpm build:pkgs   # once: the command imports the built output of @shopify/hydrogen
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example --test choose-a-variant
```

The URL must be the storefront root URL. A URL with a path, such as `/en-ca`, is a usage error.

Run `pnpm --filter @shopify/agentic-e2e run browser:install` once before the first run. It downloads the Chromium build that matches this package's Playwright version (about 340 MB) into Playwright's shared cache. To use another Chromium-based browser, set `AGENTIC_E2E_BROWSER_PATH` to its executable.

`--test <name>` selects the test: `add-to-cart` or `choose-a-variant`. Without `--test`, the command runs `add-to-cart`. Each run executes one test. `--help` shows the usage.

The command writes one JSON result line to stdout and diagnostics to stderr. pnpm adds its own lines (a script banner on stdout, and error lines on a non-zero exit) unless it runs with `-s`. When the output is parsed, use:

```sh
SHOPIFY_PROXY_KEY=... pnpm -s agentic-e2e https://your-storefront.example
```

## Tests

Both tests use the same browser, agent task, and checks. Only the pinned variant is different.

### `add-to-cart` (default)

- **Condition:** a product that does not require a selling plan and whose `selectedOrFirstAvailableVariant` is available for sale. Else `skipped`.
- **Arrange:** the command pins that `selectedOrFirstAvailableVariant`. The product page opens with no variant in the URL. The page normally shows this variant first, so the agent rarely has to select options.
- **Act:** the agent selects the options and adds 1 unit. The command stops it at the first add event.
- **Assert:** the add event rules in [How the result is decided](#how-the-result-is-decided).

### `choose-a-variant`

This test asks the agent to add a variant that is not the API default (`selectedOrFirstAvailableVariant`). The command does not check which variant the page selects first. `pass` means that the add event held the pinned variant. It does not prove that the agent changed the selection.

- **Condition:** a product that does not require a selling plan and has at least 2 variants available for sale. Else `skipped`.
- **Arrange:** the command pins the first variant that is available for sale and is not `selectedOrFirstAvailableVariant`. The product page opens with no variant in the URL. When the page first selects the API default, the agent must change at least one option.
- **Act:** the agent selects the options and adds 1 unit. The command stops it at the first add event.
- **Assert:** the same add event rules. An add event that holds another variant, such as the default one, is `fail`.

## Results and exit codes

| Status          | Exit | Meaning                                                                                                                   |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `pass`          | 0    | One add event held 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings. The cart is not read. |
| `fail`          | 1    | No single clean add event for exactly 1 unit of the pinned variant, or the agent reports an add with no add event (see below). |
| `indeterminate` | 2    | The command could not decide (see below).                                                                                 |
| `skipped`       | 3    | No eligible variant was found for the test. No browser starts.                                                            |
| usage error     | 64   | No URL, more than one argument, an unknown flag, an unknown test name, `--test` without a value, an invalid URL, a URL that is not http(s), a URL with credentials, or a URL with a path other than `/`. No browser starts. |

```json
{"test":"add-to-cart","status":"pass","reason":"One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"productHandle":"snowboard","productTitle":"Snowboard","variantId":"gid://shopify/ProductVariant/1","selectedOptions":[{"name":"Title","value":"Default Title"}]},"agent":{"completed":false,"reason":"Stopped by the command after the add event."}}
{"test":"add-to-cart","status":"fail","reason":"An add event promise was rejected.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":false,"reason":"Stopped by the command after the add event."}}
{"test":"add-to-cart","status":"fail","reason":"The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":true,"summary":"I added 1 unit to the cart."}}
{"test":"add-to-cart","status":"skipped","reason":"No eligible variant: the catalog was searched to the end.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"}}
{"test":"choose-a-variant","status":"fail","reason":"An add event did not hold exactly 1 unit of the pinned variant.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"productHandle":"t-shirt","productTitle":"T-shirt","variantId":"gid://shopify/ProductVariant/2","selectedOptions":[{"name":"Size","value":"Large"}]},"agent":{"completed":false,"reason":"Stopped by the command after the add event."}}
{"test":"choose-a-variant","status":"skipped","reason":"No product with at least 2 variants available for sale: the catalog was searched to the end.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"}}
{"test":"add-to-cart","status":"indeterminate","reason":"No add Standard Event was recorded by the time Stagehand was disconnected.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":false,"reason":"The agent reached the 20-step limit.","message":"I could not find the Add to cart button."}}
{"test":"add-to-cart","status":"indeterminate","reason":"HTTP 500","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"}}
```

`test` is the name of the test that ran. It is the first key of every result line. A usage error prints no result line.

`agent` tells what the agent reported: `{"completed":false,"reason":"Stopped by the command after the add event."}` when the command stopped it; `{"completed":true,"summary":…}` when it ended by itself with a `done` action with `taskCompleted: true`; else `{"completed":false,"reason":…}` (step limit, deadline, agent or model error, or no confirmed completion). `message` is the final message that Stagehand returned, with the key redacted. It is present only when Stagehand returned a result: at the step limit, for a failure result, or with no confirmed completion. It is not present after a thrown error, the deadline, or a stop by the command. `summary` and `message` are for triage only: the status never uses the text of the agent. The status uses `completed` only when no add event was recorded (see [How the result is decided](#how-the-result-is-decided)). An `indeterminate` result has `context`, `pinned`, and `agent` when they exist.

`fail` means one of these: an add event did not hold exactly 1 unit of the pinned variant (another product or another quantity); an add event had no `promise`; a `promise` was rejected; a `promise` resolved with cart `userErrors`; a `promise` resolved with a value that is not an object; `userErrors` or `warnings` are present but are not arrays; a `promise` resolved without a non-null `cart`; a `promise` resolved with a stock or availability warning (a warning `code` that starts with `MERCHANDISE_` or `PRODUCT_`; the reason names the codes); more than one add event was recorded; a `promise` had no outcome within 5 seconds; or no add event was recorded, but the agent confirmed that it completed the task (`"completed":true`).

`indeterminate` means one of these:

- Before the agent: `SHOPIFY_PROXY_KEY` is not set or is not one line; a Storefront API error, invalid response, or deadline; the browser did not start; the event recorder could not be installed; a navigation error or an HTTP status of 400 or higher on the product page; a page that does not show content; Stagehand did not attach.
- No add event was recorded by the time Stagehand was disconnected, and the agent did not confirm that it completed the task (it hit the step limit, the deadline, or an error, or it ended without a confirmed `done`). `agent.message` shows the final message of the agent when Stagehand returned one.
- Tool-side problems, also after an add event: an interrupt (SIGINT, SIGTERM, or SIGHUP); the Stagehand release was not confirmed.

## How the result is decided

An add event is a `shopify:cart:lines-update` Standard Event with `action: "add"`, for any product, recorded after the agent started.

1. Before the first navigation, the command adds a script to the page. It records each `shopify:cart:lines-update` event (its `action`, each line's `merchandiseId` and `quantity`, and whether it has a `promise`) and the outcome of the event's `promise`. For a resolved `promise`, it records whether the value and its `cart` are objects, the number of `userErrors`, and the `code` of each warning. It does not record warning messages.
2. The agent runs. **The command stops the agent at the first add event**, then disconnects Stagehand from the browser and confirms it. After the confirmed disconnect, the agent cannot act. A tool call already in progress at the stop can finish before that.
3. If no add event was recorded by the time Stagehand was disconnected: `fail` when the agent confirmed that it completed the task (a `done` action with `taskCompleted: true`), because the storefront dispatched no add event for the add that the agent reports. Else `indeterminate`.
4. Every add event must hold exactly 1 unit of the pinned variant, summed over its lines (other lines are allowed), and must have a `promise`. Then the command waits up to 5 seconds, from after the confirmed disconnect, until every add event's `promise` has an outcome. A wrong item or quantity, a missing `promise`, a rejected `promise`, or no outcome in 5 seconds: `fail`. After an interrupt, no wait continues.
5. The resolved value must be an object with a non-null `cart`. `userErrors` and `warnings` must be arrays or absent (Standard Actions add them only when there are any). Cart `userErrors` or a stock or availability warning (a `code` that starts with `MERCHANDISE_` or `PRODUCT_`, for example `MERCHANDISE_OUT_OF_STOCK`): `fail`. Other warnings, for example `DISCOUNT_*` codes, do not fail. More than one add event: `fail`, also before the outcomes.
6. Exactly one add event, and its `promise` resolved with a cart and without cart `userErrors` or stock or availability warnings: `pass`. The command does not read the cart, so it does not know what the cart holds.

**Standard Events are required.** A storefront that does not dispatch `shopify:cart:lines-update` with a `promise` cannot pass: without an add event the result is `fail` when the agent reports completion and `indeterminate` when it does not, even when the item reaches the cart, and an add event without a `promise` is `fail`. The listener is in the capture phase on `document`, so events dispatched directly on `window` are not recorded.

## Storefront API

Each run sends two queries to `<origin>/api/<version>/graphql.json` with the default API version of `@shopify/hydrogen` and its public client: the country and language query, and the pin query of its test (one request for each catalog page). Pass the final storefront origin: the command does not follow redirects, the same as Hydrogen's Storefront client, so an origin that redirects gives `indeterminate`. They send no access token, no cookies, and no buyer-IP header. Each request has a 10-second deadline.

- **Country and language**: `localization { language { isoCode endonymName } country { isoCode name currency { isoCode } } }`, sent without `@inContext`. Without `@inContext`, the API answers with the context that it makes active by default. This is the market of the run. A missing field gives `indeterminate`. A proxy at the storefront origin can add its own buyer-IP header, so the answer can depend on where the command runs.
- **Language name**: `endonymName` is the name of the language in that language, such as `Français` for `FR`. The agent task uses the country name and the language name. The catalog query uses the country code and the language code. The result has all of them.
- **Market in the browser**: the browser can show another market, for example because the storefront selects the market from the geo-IP of the browser. The command sets no cookie and does not change the page. Instead, the task tells the agent to shop in the named country and language, with prices in the requested currency, and to switch through the store's selectors if the store shows another country, language, or currency. The country name, the language name, and the currency are JSON-quoted as store data. If the agent cannot switch to the requested country, it may still add the item in another market. The command does not verify the market shown in the browser.
- **Pinned variant for `add-to-cart`**: with the discovered context in `@inContext`, products that are available for sale, in product ID order, 50 per page, for at most 5 pages. For each product only `selectedOrFirstAvailableVariant` is examined. The pinned variant is the first one that is available for sale and whose product does not require a selling plan. No eligible variant gives `skipped`.
- **Pinned variant for `choose-a-variant`**: the same products, order, page size, and page limit. For each product the query reads `selectedOrFirstAvailableVariant { id }` (the default variant) and the first 10 variants with `availableForSale` and `selectedOptions`. The product must not require a selling plan, must have a default variant, and must have at least 2 of those variants available for sale. The pinned variant is the first one of those variants, in API order, that is available for sale and is not the default variant. The first eligible product is used. No eligible product gives `skipped`.

The product page is `/products/<handle>` on the origin of the URL. The query and the hash of the URL are removed.

Known locale gaps are listed in [TECH_DEBT.md](./TECH_DEBT.md).

## Agent and model

One [Stagehand](https://github.com/browserbase/stagehand) agent attaches to the browser before the first navigation. Its task is to shop in the country, language, and currency of the run (see [Storefront API](#storefront-api)), select the variant options (store strings are JSON-quoted and labelled as data), add exactly 1 unit, stop as soon as it is added, not open the cart or go to checkout, and not enter personal, shipping, or payment information. A short guest-shopper system prompt tells it how to handle cookie banners and dialogs, and to keep the country, language, and currency of the store unless the task asks for a change. It has at most 20 steps and 180 seconds. The URL navigation and web search tools are removed.

There is one model path: `anthropic/claude-haiku-5-5` through the Shopify AI proxy (`https://proxy.shopify.ai/apis/anthropic/v1`), with the key from `SHOPIFY_PROXY_KEY` and the header `Shopify-Usage-Tag: agentic-e2e`. The command does not print or store the key. It turns off Stagehand's logs and removes `BROWSERBASE_CONFIG_DIR` and `BROWSERBASE_FLOW_LOGS` from its environment.

## Limits

- **Only storefronts that dispatch Standard Events are supported:** `shopify:cart:lines-update` with a `promise`. A storefront that does not dispatch the event, for example a Liquid theme without Standard Events, ends `fail` when the agent reports that it added the item, and `indeterminate` when it does not, even when the item reaches the cart. An add event without a `promise` is `fail`.
- **A wrong agent claim gives a false `fail`.** When the agent reports completion but did not add the item, and no add event comes, the result is `fail`. `agent.summary` (or `agent.message`, when the agent did not complete) helps to find the cause.
- **Checkout and account pages are not blocked.** The agent is only told not to go there, and its run is stopped at the first add event. Nothing stops it before that if it does not obey, and a tool call already in progress at the stop can finish before the disconnect is confirmed.
- **`choose-a-variant` does not prove a switch.** It pins a variant that is not the API default (`selectedOrFirstAvailableVariant`), but it does not check which variant the page selects first. A page that first selects another variant can open on the pinned variant. The test can then pass with no switch, also when the variant selector is broken.
- **`choose-a-variant` examines only the first 10 variants of each product.** A product whose other available variants come later is not used.
- **A wrong agent selection gives `fail`.** In `choose-a-variant`, when the agent adds another variant, the result is `fail`. Code cannot tell this from a broken variant selector.
- **The cart is not read.** `pass` trusts the add event's `promise`, its `cart`, its cart `userErrors`, and its warning codes. It does not prove that the cart holds the item.
- Only the first 50 warnings of a resolved `promise` are examined.
- One main page only. Events in popups or frames are not recorded.
- The script observes `event.promise` with a rejection handler. This marks a native promise as handled, so the storefront may not get an `unhandledrejection` for it.
- `pnpm build:pkgs` (or `pnpm --filter @shopify/hydrogen build`) is needed first.
- There is one model path.
- Use `pnpm -s` to get only the JSON line on stdout.

## Development

The CLI runs from TypeScript source on Node 24 (type stripping).

```sh
pnpm --filter @shopify/agentic-e2e run browser:install
pnpm --filter @shopify/agentic-e2e test:unit
pnpm --filter @shopify/agentic-e2e test:integration
```

The integration tests use one local HTTP server for the storefront pages, the Storefront API, and an add endpoint, and a local fake model endpoint that scripts the agent's clicks. They make no real model call and need no key.

The test script of `@shopify/hydrogen` rebuilds its `dist`, so do not run it at the same time as these tests. Turbo runs `@shopify/agentic-e2e#test` after `@shopify/hydrogen#test`. `packages/storefront-e2e` is a separate package. This package does not change or use it.
