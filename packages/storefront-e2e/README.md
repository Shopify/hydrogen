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

The CLI runs from TypeScript source on Node 24. It starts one fresh guest browser, attaches Stagehand before navigation, and freezes the storefront page's country and language. It does not set market cookies or headers. Every Storefront API query uses that explicit context, and every response must confirm it.

Catalog discovery pins one purchasable variant without a required selling plan. Code opens its product page; the buyer handles blocking overlays through visible controls, adds exactly one unit, then stops. It must not open the cart, go to checkout, enter personal information, or place an order. Checkout-looking document requests stay blocked before the network request is sent.

After the buyer is detached, code obtains the current cart reference through the read-only Shopify Standard Action `Shopify.actions.getCart(undefined, { signal })`. A captured checkout URL or eligible Standard Event can supply a reference when the action is absent. The configured Storefront API independently verifies the pinned variant's summed quantity. Other cart lines are allowed and reported. Page text and DOM cart summaries never decide the verdict.

API proof of one unit passes regardless of the buyer's claim. A negative cart state fails only after a confirmed add attempt; otherwise it stays indeterminate. Cart tokens and keys are opaque, and key equality or checkout-domain equality is not cart identity.

### Model and limits

The default model is `anthropic/claude-haiku-5-5`. Native Anthropic and OpenAI credentials are used only for their matching provider. `SHOPIFY_PROXY_KEY` is sent only to the Shopify AI proxy. `STOREFRONT_E2E_API_KEY` can be paired with `STOREFRONT_E2E_BASE_URL` for an explicit endpoint. Credentials are resolved only when the buyer starts, never written to reports, and never supplied to the buyer as tools.

Run `pnpm storefront-e2e --help` for credential precedence and all options. The main limits are `--max-steps`, `--timeout`, and `--catalog-pages`. `--country` and `--language` constrain the page's observed context; they do not set it. `--api-origin` overrides the API origin explicitly; otherwise the supplied storefront URL origin is used.

### Artifacts and safety

Each run writes `result.json`, `evidence.jsonl`, and step screenshots to a new directory under `packages/storefront-e2e/storefront-e2e-results/`, which is ignored by Git. `--output` selects another artifact root. A relative output path resolves from the package directory when the root script is used.

The CLI redacts model credentials, cart IDs, tokens, keys, and private checkout URL data before writing evidence or terminal output. Screenshots can still contain page content. Stagehand's unredacted session-log environment variables are removed before the SDK loads.

Exit codes are 0 for pass or skipped, 1 for fail, 2 for indeterminate, and 64 for usage errors. A product route 404 or 410 without a redirect can fail. API transport, schema, context, and incomplete-agent evidence stay distinct from storefront failures. Signals request bounded cleanup and still write a result.

### Known limits

- The initial page must expose readable Shopify country and language globals. A later responsive page with both values absent carries the frozen context forward as an assumption, not a new observation. A known different or partial context still stops the run.
- Stagehand 3.7.3 can fail to register nested third-party frames under CPU load. A frame chain that returns to the first origin is a separate SDK limitation. Page readiness waits for DCL and a visible populated body, not iframe registration or network idle.
- Browser release must be confirmed before a conclusive assertion. A pending SDK execution after confirmed CDP disconnect is diagnostic; an unconfirmed release remains indeterminate.
- The full SDK frame suite and repeated-signal tests have known flaky cases. They are not a release-green claim.

### Tests

```sh
pnpm --filter @shopify/storefront-e2e test:unit
pnpm --filter @shopify/storefront-e2e test:integration
```

Unit tests run without browsers or models. Integration tests use real headless browsers against local fixtures and local model endpoints with dummy credentials, not live stores or external model APIs. Run browser integrations serially when checking SDK frame behavior.
