# Storefront E2E

Portable Playwright suite for testing an already-running Hydrogen storefront example or generated storefront.

The CI workflow configures the suite for these reference storefronts:

| Reference | Directory | Server mode |
| --- | --- | --- |
| React Router | `templates/react-router` | Vite development server |
| Next.js | `examples/nextjs` | Next.js development server |
| Nuxt | `examples/nuxt` | Production build and Node server |

Run all commands from the repository root. For an already-running storefront:

```sh
STOREFRONT_BASE_URL=https://your-storefront.example pnpm test:e2e:storefront
```

## Run the Nuxt reference

Use Node 24 or later and the repository's pinned pnpm version. The commands below use the `chrome` channel, which requires installed Google Chrome. For another channel, install its supported browser and change `PLAYWRIGHT_BROWSER_CHANNEL`.

```sh
pnpm install --frozen-lockfile
pnpm run build:pkgs
pnpm --filter @shopify/hydrogen-example-nuxt build
PORT=4203 pnpm --filter @shopify/hydrogen-example-nuxt start
```

Keep the server running. In another terminal:

```sh
STOREFRONT_BASE_URL=http://localhost:4203/ \
STOREFRONT_SKIP_NO_JS_VARIANTS=false \
STOREFRONT_E2E_WORKERS=2 \
PLAYWRIGHT_BROWSER_CHANNEL=chrome \
TURBO_TELEMETRY_DISABLED=1 \
pnpm test:e2e:storefront
```

These commands assume `PRIVATE_STOREFRONT_API_TOKEN` is not set. Without a private token, Nuxt uses live, tokenless mock.shop data. If your shell has private credentials, add `MOCK_SHOP=1` to the start command to force mock.shop. Nuxt reads this setting for each request, so the build does not need it. A custom `PUBLIC_STORE_DOMAIN` can select `mock.shop` or a `*.mock.shop` host; use a host name, not a URL.

Without forced mock mode or a mock host, `PRIVATE_STOREFRONT_API_TOKEN` selects the real store configured in `examples/shared/config.ts`. Private mode always uses that shared store and ignores a non-mock `PUBLIC_STORE_DOMAIN`. To use another real store, update the shared Storefront API, Customer Account, and analytics configuration together. The production `node .output/server/index.mjs` start does **not** load `.env`; export required runtime variables in the server's shell or set them on the start command. Do not put private tokens in the E2E command.

## Nuxt skips and baseline

Turbo forwards the E2E runtime variables in strict mode through `turbo.json`. Nuxt uses the same tests as the other references. There is no central Nuxt future-signifier skip list and no Nuxt-only exclusion. A group skips only when live data or an optional route does not meet a test prerequisite, and the report shows the reason. The explicit `STOREFRONT_SKIP_NO_JS_VARIANTS` opt-out is separate; the Nuxt command above sets it to `false`.

See [ADR 0002](docs/adr/0002-nuxt-signifier-coverage.md) for this decision. The one-time Nuxt baseline results and probes are in [PR #4184](https://github.com/Shopify/hydrogen/pull/4184#nuxt-baseline-by-group). See the [storefront contract](docs/storefront-contract.md) for prerequisites, diagnostics, the checkout boundary, and operations.
