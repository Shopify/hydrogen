# Final Verification

Run this step only after every previous step's criteria pass. If any command fails, fix the app and rerun the failed command before moving on.

This step is mandatory and executable: every command below must actually run in this session, and its output must show it passed. Do not mark a check passed from memory, from an earlier run before subsequent code changes, or from reading the code. Do not report the setup as complete while any command is failing or unrun — a summary written before verification is a failed setup.

## Run The App's Own Checks

Inspect `package.json` scripts and run the applicable commands in this order:

1. Formatting fixer when present: `format`.
2. Static checks when present: `lint`, `typecheck`, or `check`. These must include `hydrogen gql check` — the `hydrogen-storefront-client` and `hydrogen-customer-account` skills chain it into `typecheck`; verify the chain is still in place before trusting a green run.
3. Build when present: `build`.
4. Tests when present: `test`.
5. Formatting check when present and distinct from `format`: `format:check`.

If Playwright is present, run it headless.

### Continue when

- [ ] Every applicable script was executed in this session, after the last code change, and passed
- [ ] `hydrogen gql check` ran as part of static checks (not skipped)

## Run Runtime Smoke Tests

Invoke the `hydrogen-smoke-test` skill for runtime verification of request handlers, navigation links, cart, product, collection/search, account, analytics, markets, money, and production-mode behavior. Run the request-handler curl checks against both dev and production builds when the framework supports both.

### Continue when

- [ ] Smoke checks pass against the dev server
- [ ] Smoke checks pass against the production build when the framework supports running one locally
