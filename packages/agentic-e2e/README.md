# Agentic E2E

At this stage, `agentic-e2e` opens one URL in a headless browser that it owns, runs one AI agent on the page with one fixed, harmless task, prints one JSON result line, and closes the browser.

```sh
SHOPIFY_PROXY_KEY=... pnpm agentic-e2e https://your-storefront.example
```

**This is not a storefront test.** `agent-completed` means only that the agent says it finished its task. Nothing checks the storefront or the page state.

Run `pnpm --filter @shopify/agentic-e2e run browser:install` once before the first run. It downloads the Chromium build that matches this package's Playwright version (about 340 MB) into Playwright's shared cache. To use another Chromium-based browser, set `AGENTIC_E2E_BROWSER_PATH` to its executable.

## What it does

1. Checks that `SHOPIFY_PROXY_KEY` is set. If not, it stops before the browser starts.
2. Starts Chromium with a fresh temporary profile.
3. Attaches one [Stagehand](https://github.com/browserbase/stagehand) agent to the browser, before the first navigation.
4. Loads the URL and waits until the page has visible content.
5. Gives the agent one fixed task: scroll the page down once, then report that it is done. It must not click, type, or navigate. The agent has at most 5 steps and 120 seconds. The URL navigation and web search tools are removed.
6. Disconnects Stagehand from the browser, then removes the browser process and the profile.

**Checkout and account pages are not blocked at this stage.** The agent is only told not to click or navigate. Nothing stops it if it does not obey.

## Model

There is one model path: `anthropic/claude-haiku-5-5` through the Shopify AI proxy (`https://proxy.shopify.ai/apis/anthropic/v1`). The key comes from `SHOPIFY_PROXY_KEY` only. Each request has the header `Shopify-Usage-Tag: agentic-e2e`. No other key or endpoint is used.

The command does not print or store the key. It turns off Stagehand's own logs, and it removes `BROWSERBASE_CONFIG_DIR` and `BROWSERBASE_FLOW_LOGS` from its environment, because these turn on Stagehand session logs that are not redacted.

## Result

The result goes to stdout. Diagnostics go to stderr.

```json
{"status":"agent-completed","url":"https://your-storefront.example/","title":"Home","summary":"I scrolled down once."}
{"status":"indeterminate","reason":"HTTP 500"}
```

`agent-completed` requires that the agent recorded a `done` action with `taskCompleted: true`, and that Stagehand released the browser.

`indeterminate` means one of these: `SHOPIFY_PROXY_KEY` is not set, a browser that failed to start (for example, Chromium is not installed), a navigation error, an HTTP status of 400 or higher, a page that does not show content, the agent step limit, the agent deadline, an agent or model error, no confirmed completion, no confirmed Stagehand release, or an interrupt (SIGINT, SIGTERM, or SIGHUP).

## Exit codes

| Code | Meaning                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 0    | `agent-completed`                                                                                                    |
| 2    | `indeterminate`                                                                                                      |
| 64   | Usage error: no URL, more than one argument, an unknown flag, an invalid URL, a URL that is not http(s), or a URL with credentials. No browser starts. |

## Development

The CLI runs from TypeScript source on Node 24 (type stripping). There is no build step.

```sh
pnpm --filter @shopify/agentic-e2e run browser:install
pnpm --filter @shopify/agentic-e2e test:unit
pnpm --filter @shopify/agentic-e2e test:integration
```

The integration tests use a local fake model endpoint. They make no real model call and need no key.

`packages/storefront-e2e` is a separate package. This package does not change or use it.
