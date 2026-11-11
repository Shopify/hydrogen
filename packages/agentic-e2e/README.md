# Agentic E2E

At this stage, `agentic-e2e` opens one URL in a headless browser that it owns, prints one JSON result line, and closes the browser. It uses no model and no Shopify API.

```sh
pnpm agentic-e2e https://your-storefront.example
```

The command starts Chromium with a fresh temporary profile, loads the URL, then removes the browser process and the profile.

Run `pnpm --filter @shopify/agentic-e2e run browser:install` once before the first run. It downloads the Chromium build that matches this package's Playwright version (about 340 MB) into Playwright's shared cache. To use another Chromium-based browser, set `PLAYWRIGHT_BROWSER_EXECUTABLE_PATH` to its executable.

The result goes to stdout. Diagnostics go to stderr.

```json
{"status":"opened","url":"https://your-storefront.example/","title":"Home"}
{"status":"indeterminate","reason":"HTTP 500"}
```

`indeterminate` means a browser that failed to start (for example, Chromium is not installed), a navigation error, an HTTP status of 400 or higher, the 30-second navigation deadline, or an interrupt (SIGINT, SIGTERM, or SIGHUP).

## Exit codes

| Code | Meaning                                                                         |
| ---- | ------------------------------------------------------------------------------- |
| 0    | `opened`                                                                        |
| 2    | `indeterminate`                                                                 |
| 64   | Usage error: no URL, more than one argument, a URL that is not http(s), or a URL with credentials. No browser starts. |

## Development

The CLI runs from TypeScript source on Node 24 (type stripping). There is no build step.

```sh
pnpm --filter @shopify/agentic-e2e run browser:install
pnpm --filter @shopify/agentic-e2e test:unit
pnpm --filter @shopify/agentic-e2e test:integration
```

`packages/storefront-e2e` is a separate package. This package does not change or use it.
