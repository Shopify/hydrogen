# End-to-End Test Suite with Playwright

## 1. Introduction / Overview
Hydrogen’s skeleton template currently relies on manual smoke-testing to catch regressions. Missed issues have slipped into production, forcing lengthy post-hoc debugging and `git bisect` sessions. This project introduces an automated Playwright test suite that PR authors, reviewers, and CI pipelines can run locally or on GitHub Actions. The first iteration focuses on core storefront flows against the mock shop to provide high-confidence feedback within minutes.

## 2. Goals
1. Eliminate regressions that previously escaped manual review.
2. Provide a single command (`npm run e2e`) that passes locally on macOS/Linux/CI.
3. Integrate the suite with GitHub Actions so failures block merges.
4. Keep a “basic smoke” subset under 60 s and the full suite under 15 min.
5. Maintain <1 % flake rate across 100 sequential runs.

## 3. User Stories
* **As a PR author**, I want to run `npm run e2e` locally so I can verify my changes did not break critical storefront flows.
* **As a reviewer**, I want CI to execute the same suite and surface any failures directly in the pull request so I don’t need to clone and test manually.
* **As a maintainer**, I want readable failure output and screenshots so I can quickly diagnose issues.
* **As a future contributor**, I want clear setup docs so onboarding is friction-free.

## 4. Functional Requirements
1. **Command scaffolding**  
   1.1. Add Playwright to the monorepo (dev dependency).  
   1.2. Provide `npm run e2e` (full) and `npm run e2e:smoke` (basic subset).
2. **Server management**  
   2.1. Programmatically start the skeleton template dev server on an available port.  
   2.2. Wait until `GET /` returns HTTP 200 before tests begin.  
   2.3. Tear down the server after all tests complete.
3. **Smoke subset** (runs in <60 s)  
   3.1. Homepage loads with no console errors.  
   3.2. Critical elements exist: hero image, “Add to cart” button, login link, cart icon.
4. **Full suite** (runs in ≤15 min) against mock shop data  
   4.1. **Product flow** – Navigate to a known product, assert title/price, click “Add to cart”.  
   4.2. **Cart flow** – Open cart, assert item quantity 1, update quantity to 2, assert subtotal changes, remove item, assert empty-cart UI.  
   4.3. **Collection flow** – Navigate to `/collections/[[handle]]`, verify grid renders expected products.  
   4.4. Ensure cart state is cleared between scenarios by deleting cookies + localStorage.
5. **Serialisation rules**  
   5.1. Tests mutating the same resource (e.g., cart) MUST run serially.  
   5.2. Non-mutating reads MAY run in parallel.
6. **Retry & flake control**  
   6.1. On network/GraphQL errors, automatically retry once before failing.  
   6.2. Capture trace + screenshot on second failure.
7. **CI integration**  
   7.1. Add a GitHub Actions workflow that installs browsers and runs `npm run e2e`.  
   7.2. Fail the workflow (exit 1) if any test fails.
8. **Extensibility hooks**  
   8.1. Abstract store URL so future real-store tests can reuse helpers.  
   8.2. Scaffold (but skip) Customer Account API tests: placeholder file requiring `SHOPIFY_HYDROGEN_FLAG_CUSTOMER_ACCOUNT_PUSH=true`.

## 5. Non-Goals (Out of Scope)
* Performance audits, Lighthouse scores, or visual regression diffs.
* Out-of-stock flows, discount codes, or real store linkage (to be added later).
* Troubleshooting guide; will be added once recurring issues emerge.

## 6. Design Considerations
* Place all Playwright assets in `/e2e` at repo root to keep template dirs clean.
* Use Playwright’s built-in HTML reporter for local runs and upload artifacts to Actions.
* Port selection via `get-port` to avoid collisions in parallel CI jobs.

## 7. Technical Considerations
* Node version must match repo’s existing `engines.node` spec.  
* GitHub Actions uses the official Playwright CI image to simplify browser install.  
* Implement a utility to clear cookies/localStorage between tests.  
* Use TypeScript for test files; leverage existing tsconfig path aliases if feasible.

## 8. Success Metrics
* 100 % pass rate on main branch; <1 % flake rate measured via nightly cron job.  
* Reduction in post-merge regression incidents to zero over the next three releases.

## 9. Open Questions
1. Confirm exact list of selectors/text to assert on homepage (needs review of rendered markup).
2. Verify whether clearing cookies suffices to reset cart or if additional API calls are required.
3. Determine stable product IDs and collection handles for future real-store tests.
4. Decide on discount codes to include when discount flow moves into scope.
