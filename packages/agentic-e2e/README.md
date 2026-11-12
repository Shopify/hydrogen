# Agentic E2E

`agentic-e2e` checks that an AI agent can use the cart of a storefront through its UI. Without `--test`, the command runs every test (see [Tests](#tests)), in order, one at a time. With `--test <name>`, it runs only that test. Each test pins one product variant through the Storefront API, opens the product page of that variant in a new headless browser session that it owns, and asks one AI agent to add exactly 1 unit of that variant to the cart. In `change-quantity-and-remove`, the agent then also changes the quantity of the item in the cart and removes it. Code, not the agent, then decides the result from Shopify Standard Events. Only when the events do not show the full task (no add event, or, in `change-quantity-and-remove`, fewer cart changes than the task asks for), the code also uses whether the agent confirmed that it completed the task. **The command does not read the cart:** `pass` means that the storefront's one add event resolved with a cart and without cart user errors or stock or availability warnings, its other cart events resolved without cart user errors, and, in `change-quantity-and-remove`, showed the expected quantities, not that the cart was checked. Each test prints one result line when it ends and closes its browser.

**Supported storefronts:** only storefronts that dispatch the `shopify:cart:lines-update` Standard Event with a `promise` (Hydrogen storefronts do). A storefront that does not dispatch it, for example a Liquid theme without Standard Events, is out of scope: the result is `fail` when the agent reports that it added the item, and `indeterminate` when it does not, even when the item reaches the cart.

```sh
pnpm build:pkgs   # once: the command imports the built output of @shopify/hydrogen
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example                          # every test
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example --test choose-a-variant   # one test
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example --test change-quantity-and-remove
```

The URL must be the storefront root URL. A URL with a path, such as `/en-ca`, is a usage error.

Run `pnpm --filter @shopify/agentic-e2e run browser:install` once before the first run. It downloads the Chromium build that matches this package's Playwright version (about 340 MB) into Playwright's shared cache. To use another Chromium-based browser, set `AGENTIC_E2E_BROWSER_PATH` to its executable.

Without `--test`, the command runs every test in this order: `add-to-cart`, `choose-a-variant`, then `change-quantity-and-remove`. `--test <name>` runs only that test. A `fail`, `indeterminate`, or `skipped` test does not stop the later tests. Each test is one agent run (one paid model run), so a run without `--test` costs three agent runs, one for each test. `--help` shows the usage.

By default, the command writes one table line to stdout for each test, when that test ends: the status, the test name, and the reason when the status is not `pass`. There is no header and no summary line.

```text
  pass           add-to-cart
  fail           choose-a-variant             An add event did not hold exactly 1 unit of the pinned variant.
  indeterminate  change-quantity-and-remove   The cart line went 1, 2 by the time Stagehand was disconnected. Expected 1, 2, 1, removed.
```

In an interactive terminal, a temporary spinner line on stderr shows the test that is running until its result line replaces it. In CI, with redirected stdout or stderr, or with `--json`, there is no spinner and the output does not change.

With `--json`, the command writes one JSON result line to stdout for each test instead (see [Results and exit codes](#results-and-exit-codes)), and progress lines to stderr. Use it for scripts and for triage: the JSON line has the context, the pinned variant, and the agent outcome and message. In both modes, stderr gets the usage error, the interrupt lines, and `Cleanup failed: …`.

pnpm adds its own lines (a script banner on stdout, and error lines on a non-zero exit) unless it runs with `-s`. When the output is parsed, use:

```sh
SHOPIFY_PROXY_KEY=... pnpm -s agentic-e2e https://your-storefront.example --json
```

## Tests

Every test uses the same browser and the same product page. `add-to-cart` and `choose-a-variant` also use the same agent task and checks: only the pinned variant is different. `change-quantity-and-remove` has its own pin, agent task, stop rule, and checks. Each test starts a new browser session and pins its own variant. One run reads the country and language once and uses them for every test. If that read fails, the test is `indeterminate`, and the next test reads again.

### `add-to-cart`

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

### `change-quantity-and-remove`

This test checks that a buyer can change the quantity of an item in the cart and remove it.

- **Condition:** the same eligible variant as `add-to-cart`, and the shop accepts 2 units of it (see the stock check in [Storefront API](#storefront-api)). Else `skipped`, and no browser starts.
- **Arrange:** the command pins that variant. The product page opens with no variant in the URL, as in `add-to-cart`.
- **Act:** one agent task: add exactly 1 unit, open the cart if it is not open, increase the quantity of the item to 2 with the cart's quantity control, decrease it to 1, then remove the item with the cart's remove control. One change at a time, no change of any other item, and no checkout. The command stops the agent as soon as the cart events show the full sequence, or a sequence that can no longer become it (see [How the result is decided](#how-the-result-is-decided)).
- **Assert:** from the Standard Events only: the one cart line that the add created goes from quantity 1 to 2, to 1, then is removed, in that order, and every cart event resolved without cart user errors.

## Results and exit codes

| Status          | Meaning                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pass`          | One add event held 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings. In `change-quantity-and-remove`, the cart line also went 1, 2, 1, removed. The cart is not read. |
| `fail`          | No single clean add event for exactly 1 unit of the pinned variant, or the agent reports an add with no add event (see below). In `change-quantity-and-remove`, also a cart change event that did not resolve cleanly, or the wrong quantities. |
| `indeterminate` | The command could not decide (see below).                                                                               |
| `skipped`       | No eligible variant was found for the test. No browser starts for that test.                                            |

The exit code uses the results of all the tests that ran:

| Exit | When                                                                                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | A result is `fail`.                                                                                                                                                                                                    |
| 2    | No result is `fail`, and a result is `indeterminate`.                                                                                                                                                                  |
| 3    | Every result is `skipped`.                                                                                                                                                                                             |
| 0    | At least one result is `pass`, and every other result is `pass` or `skipped`.                                                                                                                                          |
| 64   | Usage error: no URL, more than one argument, an unknown flag, an unknown test name, `--test` without a value, an invalid URL, a URL that is not http(s), a URL with credentials, or a URL with a path other than `/`. No result line. No browser starts. |

With `--test`, there is one result: 0 for `pass`, 1 for `fail`, 2 for `indeterminate`, 3 for `skipped`.

An interrupt (SIGINT, SIGTERM, or SIGHUP) ends the test that is running as `indeterminate`, and that test prints its line. A test that already had its result when the interrupt came (for example during its browser cleanup) keeps that result. The later tests do not run and print no line. When an interrupt stops the run before every test ran, the exit code is 2, or 1 when a test failed, also when the test that was running already had its result. When every selected test ran (for example with `--test`), the exit code follows the table.

The `--json` result lines:

```json
{"test":"add-to-cart","status":"pass","reason":"One add event held exactly 1 unit of the pinned variant and resolved with a cart, without cart user errors or stock or availability warnings.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"productHandle":"snowboard","productTitle":"Snowboard","variantId":"gid://shopify/ProductVariant/1","selectedOptions":[{"name":"Title","value":"Default Title"}]},"agent":{"completed":false,"reason":"Stopped by the command after the add event."}}
{"test":"add-to-cart","status":"fail","reason":"An add event promise was rejected.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":false,"reason":"Stopped by the command after the add event."}}
{"test":"add-to-cart","status":"fail","reason":"The agent reports that it added the item, but no shopify:cart:lines-update event was dispatched.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":true,"summary":"I added 1 unit to the cart."}}
{"test":"add-to-cart","status":"skipped","reason":"No eligible variant: the catalog was searched to the end.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"}}
{"test":"choose-a-variant","status":"fail","reason":"An add event did not hold exactly 1 unit of the pinned variant.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"productHandle":"t-shirt","productTitle":"T-shirt","variantId":"gid://shopify/ProductVariant/2","selectedOptions":[{"name":"Size","value":"Large"}]},"agent":{"completed":false,"reason":"Stopped by the command after the add event."}}
{"test":"choose-a-variant","status":"skipped","reason":"No product with at least 2 variants available for sale: the catalog was searched to the end.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"}}
{"test":"change-quantity-and-remove","status":"pass","reason":"The cart line went 1, 2, 1, removed, and every cart event resolved without cart user errors.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":false,"reason":"Stopped by the command after the cart changes."}}
{"test":"change-quantity-and-remove","status":"fail","reason":"The cart line went 1, 1. Expected 1, 2, 1, removed.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":false,"reason":"Stopped by the command after the cart changes."}}
{"test":"change-quantity-and-remove","status":"skipped","reason":"No variant could be added to a cart with 2 units (5 eligible variants checked): the 5-variant check limit was reached.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"}}
{"test":"add-to-cart","status":"indeterminate","reason":"No add Standard Event was recorded by the time Stagehand was disconnected.","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"},"agent":{"completed":false,"reason":"The agent reached the 20-step limit.","message":"I could not find the Add to cart button."}}
{"test":"add-to-cart","status":"indeterminate","reason":"HTTP 500","context":{"country":"US","language":"EN","countryName":"United States","languageName":"English","currency":"USD"},"pinned":{"…":"…"}}
```

`test` is the name of the test of the line. It is the first key of every JSON result line. A usage error prints no result line.

`agent` tells what the agent reported: `{"completed":false,"reason":"Stopped by the command after the add event."}` when the command stopped it (`"Stopped by the command after the cart changes."` in `change-quantity-and-remove`); `{"completed":true,"summary":…}` when it ended by itself with a `done` action with `taskCompleted: true`; else `{"completed":false,"reason":…}` (step limit, deadline, agent or model error, or no confirmed completion). `message` is the final message that Stagehand returned, with the key redacted. It is present only when Stagehand returned a result: at the step limit, for a failure result, or with no confirmed completion. It is not present after a thrown error, the deadline, or a stop by the command. `summary` and `message` are for triage only: the status never uses the text of the agent. The status uses `completed` only when no add event was recorded or, in `change-quantity-and-remove`, when the cart line changes stopped early (see [How the result is decided](#how-the-result-is-decided)). An `indeterminate` result has `context`, `pinned`, and `agent` when they exist.

`fail` means one of these: an add event did not hold exactly 1 unit of the pinned variant (another product or another quantity); an add event had no `promise`; a `promise` was rejected; a `promise` resolved with cart `userErrors`; a `promise` resolved with a value that is not an object; `userErrors` or `warnings` are present but are not arrays; a `promise` resolved without a non-null `cart`; a `promise` resolved with a stock or availability warning (a warning `code` that starts with `MERCHANDISE_` or `PRODUCT_`; the reason names the codes); more than one add event was recorded; a `promise` had no outcome within 5 seconds; or no add event was recorded, but the agent confirmed that it completed the task (`"completed":true`).

`indeterminate` means one of these:

- Before the agent: `SHOPIFY_PROXY_KEY` is not set or is not one line (the command checks it once, before any request or browser, and then prints one `indeterminate` line for each test); a Storefront API error, invalid response, or deadline; the browser did not start; the event recorder could not be installed; a navigation error or an HTTP status of 400 or higher on the product page; a page that does not show content; Stagehand did not attach.
- No add event was recorded by the time Stagehand was disconnected, and the agent did not confirm that it completed the task (it hit the step limit, the deadline, or an error, or it ended without a confirmed `done`). `agent.message` shows the final message of the agent when Stagehand returned one.
- Tool-side problems, also after an add event: an interrupt (SIGINT, SIGTERM, or SIGHUP); the Stagehand release was not confirmed.
- In `change-quantity-and-remove`: code cannot follow the cart line, or the cart line changes stopped early and the agent did not confirm that it completed the task (see [`change-quantity-and-remove` checks](#change-quantity-and-remove-checks)).

## How the result is decided

An add event is a `shopify:cart:lines-update` Standard Event with `action: "add"`, for any product, recorded after the agent started. The steps below are those of `add-to-cart` and `choose-a-variant`. `change-quantity-and-remove` uses the same script, detach, and wait, with its own stop rule and checks (see [`change-quantity-and-remove` checks](#change-quantity-and-remove-checks)).

1. Before the first navigation, the command adds a script to the page. It records each `shopify:cart:lines-update` event (its `action`, each line's `merchandiseId` and `quantity`, and whether it has a `promise`) and the outcome of the event's `promise`. For a resolved `promise`, it records whether the value and its `cart` are objects, the number of `userErrors`, and the `code` of each warning. It does not record warning messages.
2. The agent runs. **The command stops the agent at the first add event**, then disconnects Stagehand from the browser and confirms it. After the confirmed disconnect, the agent cannot act. A tool call already in progress at the stop can finish before that.
3. If no add event was recorded by the time Stagehand was disconnected: `fail` when the agent confirmed that it completed the task (a `done` action with `taskCompleted: true`), because the storefront dispatched no add event for the add that the agent reports. Else `indeterminate`.
4. Every add event must hold exactly 1 unit of the pinned variant, summed over its lines (other lines are allowed), and must have a `promise`. Then the command waits up to 5 seconds, from after the confirmed disconnect, until every add event's `promise` has an outcome. A wrong item or quantity, a missing `promise`, a rejected `promise`, or no outcome in 5 seconds: `fail`. After an interrupt, no wait continues.
5. The resolved value must be an object with a non-null `cart`. `userErrors` and `warnings` must be arrays or absent (Standard Actions add them only when there are any). Cart `userErrors` or a stock or availability warning (a `code` that starts with `MERCHANDISE_` or `PRODUCT_`, for example `MERCHANDISE_OUT_OF_STOCK`): `fail`. Other warnings, for example `DISCOUNT_*` codes, do not fail. More than one add event: `fail`, also before the outcomes.
6. Exactly one add event, and its `promise` resolved with a cart and without cart `userErrors` or stock or availability warnings: `pass`. The command does not read the cart, so it does not know what the cart holds.

**Standard Events are required.** A storefront that does not dispatch `shopify:cart:lines-update` with a `promise` cannot pass: without an add event the result is `fail` when the agent reports completion and `indeterminate` when it does not, even when the item reaches the cart, and an add event without a `promise` is `fail`. The listener is in the capture phase on `document`, so events dispatched directly on `window` are not recorded.

### `change-quantity-and-remove` checks

The verdict relies on these facts about `shopify:cart:lines-update`, seen on a Hydrogen storefront and on a Liquid Horizon theme: each cart change dispatches exactly one event with a `promise`. An add has `action: "add"` and lines with `merchandiseId` and `quantity`. A plus or minus has `action: "update"` and lines with the cart line `id` and the new absolute `quantity`. A remove has `action: "remove"` and `quantity: 0`. The `promise` resolves with a `cart` whose `lines` have each line's `id` and `quantity` (`lines: []` after the last remove). The line `id` in the inputs equals the `id` in the add result and does not change. Only the add input has a variant ID. A result without `userErrors` (Horizon has none) counts as 0 user errors. The script also records each input line's `id` and each result line's `id` and `quantity`. Line IDs can hold the cart token: they stay in memory and are never printed.

The command stops the agent as soon as the steps below are complete or already wrong, or code cannot follow the line. Then it detaches Stagehand and waits up to 5 seconds, as for the add tests. The first rule that matches decides:

1. No add event: `fail` when the agent confirmed that it completed the task, else `indeterminate`.
2. The command waits until every cart event has an outcome, or a problem is already certain.
3. An add event that fails the add checks of steps 4 and 5 above (for example a wrong item or quantity, no `promise`, a rejected `promise`, cart `userErrors`, no `cart`, or a stock or availability warning); more than one add event; a cart event that is not an add with no `promise`, a rejected `promise`, or cart `userErrors`: `fail`. Then a cart event with no outcome in 5 seconds: `fail`.
4. The followed line: the only line of the add result, or, when the add result has more lines (for example an automatic gift), the line that the first `update` or `remove` names. When the add result has no lines, the first change names a line that the add result does not have, or a change result has no lines: `indeterminate`.
5. The steps: the line's quantity in the add result, then its quantity in the result of each `update` or `remove` that names it, in order (0 when the result no longer has the line). Changes of other lines are not steps.
6. The steps are 1, 2, 1, removed: `pass`. The start of that sequence only (for example 1, 2): `fail` when the agent confirmed that it completed the task, else `indeterminate`. Anything else (for example 1, 1, or 1, 2, removed): `fail`.

## Storefront API

The command sends its queries to `<origin>/api/<version>/graphql.json` with the default API version of `@shopify/hydrogen` and its public client: the country and language query, once for each run (the next test sends it again only when the read failed), the pin query of each test (one request for each catalog page), and, for `change-quantity-and-remove`, one `cartCreate` mutation for each checked variant. Pass the final storefront origin: the command does not follow redirects, the same as Hydrogen's Storefront client, so an origin that redirects gives `indeterminate`. They send no access token, no cookies, and no buyer-IP header. Each request has a 10-second deadline.

- **Country and language**: `localization { language { isoCode endonymName } country { isoCode name currency { isoCode } } }`, sent without `@inContext`. Without `@inContext`, the API answers with the context that it makes active by default. This is the market of the run. A missing field gives `indeterminate`. A proxy at the storefront origin can add its own buyer-IP header, so the answer can depend on where the command runs.
- **Language name**: `endonymName` is the name of the language in that language, such as `Français` for `FR`. The agent task uses the country name and the language name. The catalog query uses the country code and the language code. The result has all of them.
- **Market in the browser**: the browser can show another market, for example because the storefront selects the market from the geo-IP of the browser. The command sets no cookie and does not change the page. Instead, the task tells the agent to shop in the named country and language, with prices in the requested currency, and to switch through the store's selectors if the store shows another country, language, or currency. The country name, the language name, and the currency are JSON-quoted as store data. If the agent cannot switch to the requested country, it may still add the item in another market. The command does not verify the market shown in the browser.
- **Pinned variant for `add-to-cart`**: with the discovered context in `@inContext`, products that are available for sale, in product ID order, 50 per page, for at most 5 pages. For each product only `selectedOrFirstAvailableVariant` is examined. The pinned variant is the first one that is available for sale and whose product does not require a selling plan. No eligible variant gives `skipped`.
- **Pinned variant for `choose-a-variant`**: the same products, order, page size, and page limit. For each product the query reads `selectedOrFirstAvailableVariant { id }` (the default variant) and the first 10 variants with `availableForSale` and `selectedOptions`. The product must not require a selling plan, must have a default variant, and must have at least 2 of those variants available for sale. The pinned variant is the first one of those variants, in API order, that is available for sale and is not the default variant. The first eligible product is used. No eligible product gives `skipped`.
- **Pinned variant for `change-quantity-and-remove`**: the same products, order, pages, and eligible variants as `add-to-cart`. For each eligible variant, in that order, the command sends one tokenless `cartCreate` with one line of 2 units of the variant, with the discovered context in `@inContext`. It reads only the line quantities, the variant of each line, and `userErrors { code message }`, not the cart ID or the checkout URL. The variant is pinned when the cart has a line of that variant with exactly 2 units and there are no `userErrors`. Over stock, the API answers with a lower quantity and no `userErrors`, so the variant is not pinned. `quantityAvailable` cannot be read without a token, so this check is the stock check. **Each check creates one cart on the shop that nothing uses.** At most 5 variants are checked in one run. When none of them is accepted: `skipped`, with the number of checked variants. No eligible variant gives the same `skipped` reason as `add-to-cart`.

The product page is `/products/<handle>` on the origin of the URL. The query and the hash of the URL are removed.

Known locale gaps are listed in [TECH_DEBT.md](./TECH_DEBT.md).

## Agent and model

One [Stagehand](https://github.com/browserbase/stagehand) agent attaches to the browser before the first navigation. Its task is to shop in the country, language, and currency of the run (see [Storefront API](#storefront-api)), select the variant options (store strings are JSON-quoted and labelled as data), add exactly 1 unit, stop as soon as it is added, not open the cart or go to checkout, and not enter personal, shipping, or payment information. In `change-quantity-and-remove`, the task instead continues after the add: open the cart if it is not open, increase the quantity of the item to 2 and wait until the cart shows 2, decrease it to 1 and wait until the cart shows 1, remove the item with the cart's remove control (not by decreasing the quantity), and stop when the cart is empty. One change at a time, no change of any other item, and no checkout. A short guest-shopper system prompt tells it how to handle cookie banners and dialogs, and to keep the country, language, and currency of the store unless the task asks for a change. It has at most 20 steps and 180 seconds. The URL navigation and web search tools are removed.

Each test is one agent run, so one paid model run. A run without `--test` makes three agent runs, one for each test.

There is one model path: `anthropic/claude-haiku-5-5` through the Shopify AI proxy (`https://proxy.shopify.ai/apis/anthropic/v1`), with the key from `SHOPIFY_PROXY_KEY` and the header `Shopify-Usage-Tag: agentic-e2e`. The command does not print or store the key. It turns off Stagehand's logs and removes `BROWSERBASE_CONFIG_DIR` and `BROWSERBASE_FLOW_LOGS` from its environment.

## Limits

- **Only storefronts that dispatch Standard Events are supported:** `shopify:cart:lines-update` with a `promise`. A storefront that does not dispatch the event, for example a Liquid theme without Standard Events, ends `fail` when the agent reports that it added the item, and `indeterminate` when it does not, even when the item reaches the cart. An add event without a `promise` is `fail`.
- **A wrong agent claim gives a false `fail`.** When the agent reports completion but did not add the item, and no add event comes, the result is `fail`. `agent.summary` (or `agent.message`, when the agent did not complete) helps to find the cause.
- **Checkout and account pages are not blocked.** The agent is only told not to go there, and its run is stopped at the first add event (in `change-quantity-and-remove`, after the cart changes). Nothing stops it before that if it does not obey, and a tool call already in progress at the stop can finish before the disconnect is confirmed.
- **`choose-a-variant` does not prove a switch.** It pins a variant that is not the API default (`selectedOrFirstAvailableVariant`), but it does not check which variant the page selects first. A page that first selects another variant can open on the pinned variant. The test can then pass with no switch, also when the variant selector is broken.
- **`choose-a-variant` examines only the first 10 variants of each product.** A product whose other available variants come later is not used.
- **A wrong agent selection gives `fail`.** In `choose-a-variant`, when the agent adds another variant, the result is `fail`. Code cannot tell this from a broken variant selector.
- **The cart is not read.** `pass` trusts the add event's `promise`, its `cart`, its cart `userErrors`, and its warning codes. It does not prove that the cart holds the item. `change-quantity-and-remove` also trusts the cart lines of each event's result.
- Only the first 50 warnings of a resolved `promise` are examined.
- **`change-quantity-and-remove` cannot tell which control removed the line.** On some storefronts (Hydrogen), minus at quantity 1 gives the same `remove` event as the remove control.
- **`change-quantity-and-remove` follows the line by its cart line ID, not by a variant ID**, because `update` and `remove` events and their results have no variant ID. When the add result also has an automatic gift line, the followed line is the one that the first change names.
- **A wrong agent action gives `fail` in `change-quantity-and-remove`.** For example, a remove before the decrease is `fail`, because code cannot tell it from a storefront defect. An agent that stops early, without a confirmed completion, gives `indeterminate`.
- **The `change-quantity-and-remove` stock check leaves carts on the shop:** one cart that nothing uses for each checked variant, at most 5 in one run.
- One main page only. Events in popups or frames are not recorded.
- The script observes `event.promise` with a rejection handler. This marks a native promise as handled, so the storefront may not get an `unhandledrejection` for it.
- `pnpm build:pkgs` (or `pnpm --filter @shopify/hydrogen build`) is needed first.
- There is one model path.
- Use `pnpm -s` to get only the result lines on stdout: one line for each test.

## Development

The CLI runs from TypeScript source on Node 24 (type stripping).

```sh
pnpm --filter @shopify/agentic-e2e run browser:install
pnpm --filter @shopify/agentic-e2e test:unit
pnpm --filter @shopify/agentic-e2e test:integration
```

The integration tests use one local HTTP server for the storefront pages (with a cart that opens after the add), the Storefront API (with a `cartCreate` answer), and add and cart change endpoints, and a local fake model endpoint that scripts the agent's clicks. They make no real model call and need no key.

The test script of `@shopify/hydrogen` rebuilds its `dist`, so do not run it at the same time as these tests. Turbo runs `@shopify/agentic-e2e#test` after `@shopify/hydrogen#test`. `packages/storefront-e2e` is a separate package. This package does not change or use it.
