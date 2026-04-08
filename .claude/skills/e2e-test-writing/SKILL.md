---
name: e2e-test-writing
description: >
  Guide for writing high-quality Playwright E2E tests for Hydrogen. Use when the user asks to
  "write e2e tests", "add playwright tests", "test this feature end-to-end", "write recipe tests",
  "add integration tests", or mentions Playwright, E2E testing, or test coverage for user-facing features.
user-invocable: true
---

# `/e2e-test-writing` - E2E Test Writing for Hydrogen

Use this skill when implementing or reviewing Playwright E2E tests in this repository.

## Syntax

```text
/e2e-test-writing <task>
```

Examples:

- `/e2e-test-writing add recipe coverage for cart drawer quantity changes`
- `/e2e-test-writing review locator quality in e2e/tests/cart.test.ts`

## Source of Truth

- Follow `e2e/CLAUDE.md` for all active test patterns and conventions.
- Do not duplicate large guidance here; keep this skill as the entry point.

## Core Expectations

1. Prefer role-based, accessibility-first selectors.
2. Assert user-visible behavior, not implementation details.
3. Wait for visible effects (`expect`, `expect.poll`), never arbitrary timeouts.
4. Keep tests isolated and organize shared setup with `beforeEach` when it improves clarity.
5. Run Playwright tests in headless mode.

## Workflow

1. Read `e2e/CLAUDE.md` before writing tests.
2. Implement or update tests with user-centric assertions.
3. Improve accessibility markup when it enables stronger locators.
4. Run targeted Playwright tests first, then broader suites if needed.

## Verification Commands

```bash
pnpm exec playwright test --project=skeleton
```

Use narrower test paths during iteration, then run the appropriate full project suite before finishing.
