---
name: error-reporting
description: >
  Error handling and logging policy for @shopify/hydrogen: when to throw, when to log through the
  logging contract, when to expose reactive state, and how tests assert failures. Always use when
  developing or reviewing runtime logic for the @shopify/hydrogen library.
---

# Error Reporting Policy

How `@shopify/hydrogen` handles runtime failures: when to throw, when to log, when to expose reactive state, and how logs are formatted, configured, and tested. Apply this policy to any new or changed runtime logic in `packages/hydrogen/src`.

## Taxonomy

Pick the mechanism from the failure class. Never double-report (throw AND log the same failure).

| Failure class | Mechanism | Examples |
| --- | --- | --- |
| Programming errors | Throw a typed error synchronously. | Bad arguments, invariant violations. |
| Request-scoped failures with a caller | Throw a typed error; the caller decides retry/render. | `StorefrontApiError`, `CustomerAccountApiError`, `CartActionError`, `CartNetworkError`. |
| Server handlers with internal recovery | Catch failures, log via the scoped logger, return a structured error `Response`. | Cart server handler catches a network failure and returns `500` with a JSON error body. |
| Background browser failures | Scoped logger at `error` level. | Script loads (Shop Pay), background cart loads, analytics publish failures. |
| Misuse / degradation | Scoped logger at `warn` level. | Mock shop detected, analytics destination misconfigured, deprecated option passed. |
| Buyer-visible user errors | Reactive state only — never logged. | Cart `userErrors` surfaced to the UI; the user corrects and retries. |

## Logger contract

### Internal call convention

`getLogger` is internal — not part of the public package API.

```ts
import { getLogger } from "../logging"; // relative import within src/
const log = getLogger("cart");
log.error("cart initial load failed", { error });
```

- `getLogger(scope)` returns a lazily-resolved scoped logger. Prefer one module-level `const log` per file when the scope is static. Use stable subsystem scopes; proxy descriptors provide dynamic scopes.
- Messages are unprefixed, lowercase-leaning, and without trailing colons; the sink owns formatting.
- `context.error` becomes a separate console argument; other context keys become a trailing object.
- Never call `console.*` directly in runtime files under `packages/hydrogen/src` — the `no-console` lint rule enforces this. Sanctioned runtime exceptions: the built-in sink in `src/core/logging/logging.ts` and the CLI. Tests may spy on or mock `console` for the exceptions listed below.

### `HydrogenLogger`

A minimal structural interface with six level methods:

```ts
interface HydrogenLogger {
  trace: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  info:  (message: string, context?: LogContext) => void;
  warn:  (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  fatal: (message: string, context?: LogContext) => void;
}
```

`LogContext` is `{ scope?: string; error?: unknown; [key: string]: unknown }`.

### `configureLogging`

```ts
import { configureLogging } from "@shopify/hydrogen";

const logger = {
  trace: console.debug,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  fatal: console.error,
};

configureLogging({ logger, level: "warn" });
```

- Global, called once at startup (app entry on the browser, module init on the server).
- `logger` — any `HydrogenLogger`; defaults to the built-in console sink.
- `level` — minimum severity forwarded; defaults to `"info"`.
- Last-call-wins: reconfiguring applies the new options.

### Default console sink

Formats entries as `[hydrogen:<level>:<scope>] <message>`, followed by `context.error` (if present) and a trailing object of remaining context fields.

## Serialized inline scripts — documented exception

Inline/CDN scripts that Hydrogen serializes into HTML are compiled to strings via `import … with { type: "script" }` chains. They never see the app bundle's global state, so `configureLogging` cannot reach them. The analytics bootstrap path, its bus/destination-manager modules, and the consent bootstrap always write to `console` with the standard `[hydrogen:<level>:<scope>]` prefix via the `consoleLogger` sink — when writing code in a serialized-script import chain, use `consoleLogger` directly with an explicit `{ scope }` instead of `getLogger`.

## Non-goals

- Per-request child loggers / request correlation. Scopes are per-subsystem, not per-request.

## Test expectations

- Failure paths inject a test logger instead of mocking `console`: `configureLogging({ logger })` with six `vi.fn()` methods, `resetLoggingForTests()` in `afterEach`. Assert `(message, { scope, ...context })` — no prefix strings.
- Exceptions that still spy `console`: serialized inline-script import chains (analytics bus/destination-manager, consent) write through `consoleLogger` directly, and `logging.test.ts` verifies the sink's own `[hydrogen:<level>:<scope>]` formatting.
- The `no-console` lint rule enforces the policy: the only sanctioned `console` call site is `src/core/logging/logging.ts`, which carries an inline `oxlint-disable-next-line no-console`. CLI and test files are exempt.
