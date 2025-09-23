# Automated Playwright End-to-End Test Suite

## 1. Introduction / Overview
Hydrogen's skeleton template currently relies on manual smoke-testing to catch regressions. Missed issues have reached production, forcing lengthy post-hoc debugging and `git bisect` sessions. This project introduces an automated Playwright test suite that PR authors, reviewers, and CI pipelines can execute locally (`npm run e2e`) and on GitHub Actions. The implementation delivers a fast smoke test against the skeleton template, comprehensive testing of all permutations of the `npm create @shopify/hydrogen` options, and strategic testing of recipes with selected base permutations.

## 2. Goals
1. Eliminate regressions that previously escaped manual review.
2. Provide simple commands (`npm run e2e`, `npm run e2e:smoke`) that pass locally on macOS/Linux and in CI.
3. Integrate the suite with GitHub Actions so failures block merges.
4. Keep the “basic smoke” subset under **60 s** and the full matrix under **20 min**.
5. Maintain **<1 %** flake rate across 100 sequential runs.

## 3. User Stories
* **PR Author**: I can run `npm run e2e` locally to verify my changes did not break critical storefront flows.
* **Reviewer**: CI executes the same suite and surfaces failures directly in the pull request, so I don’t need to test manually.
* **Maintainer**: Failures provide readable output plus screenshots/videos/logs, enabling quick diagnosis.
* **Future Contributor**: Clear setup docs let me onboard and run the suite without friction.

## 4. Functional Requirements
1. `npm run e2e` spins up the dev server for the target project and executes Playwright tests.
2. A **Enhanced Smoke Test Pack** (≤60 s) must:
   1. Run against the repository's existing skeleton template without scaffolding a new project.
   2. Execute a complete user journey:
      - Navigate to homepage and verify no errors
      - Check initial cart quantities before any user actions
      - Navigate to collections page
      - Click on a specific product from collections
      - Verify correct navigation to product page
      - Add item to cart from product page
      - Open cart and verify item quantity has increased and price updated correctly
      - Verify checkout button exists
      - Click checkout button and navigate to checkout page
      - Confirm successful arrival at checkout page
      - Ensure no errors throughout entire flow
   3. All network requests must be awaited to completion rather than using fixed timeouts.
3. A **Full Matrix Pack** must cover the **32 language × styling × scaffold × market-URL permutations** of `npm create @shopify/hydrogen`:
   • Language: JavaScript vs TypeScript
   • Styling library: Tailwind v4, Vanilla Extract, CSS Modules, PostCSS
   • Scaffold routes & core functionality: **Yes** vs **No**
       • If **Yes**, include Markets URL structure: subfolders, subdomains, top-level domains
   Each permutation is scaffolded in a timestamped directory inside `tmp/` using the pattern `hydrogen-<permutation>-<YYYYMMDDHHMMSS>`. These directories are **retained** after the E2E run so developers can manually explore them. When multiple directories exist for the same permutation, the E2E suite runs against the most recently scaffolded one.
4. A **CLI Command Test Pack** (<10 min, ideally) must validate critical Hydrogen CLI commands:
   - `hydrogen build` - Verify production build completes
   - `hydrogen check` - Validate code checking functionality
   - `hydrogen codegen` - Test GraphQL code generation
   - `hydrogen debug cpu` - Verify CPU debugging GUI opens correctly
   - `hydrogen dev` - Test development server startup
   - `hydrogen preview` - Validate preview server functionality
   - `hydrogen shortcut` - Test shortcut command functionality
   - `hydrogen upgrade` - Verify NPM dependency modifications and follow-up instructions generation
   - Note: These tests use Hydrogen's built-in mock shop data (automatically active when not linked to Shopify)
5. A **Authenticated CLI Test Pack** must validate Shopify-linked functionality:
   - `hydrogen login` - Test authentication flow
   - `hydrogen link` - Link to a Hydrogen storefront in Shopify admin
   - `hydrogen customer-account-push` - Test Customer Account API configuration
   - `hydrogen deploy` - Validate deployment capabilities
   - `hydrogen env list/pull/push` - Test environment variable management
   - `hydrogen list` - List linked storefronts
   - `hydrogen logout` - Test logout functionality
   - `hydrogen unlink` - Unlink from Shopify admin
6. A **Recipe Test Pack with Authentication** must:
   - Test recipes that require real shop data from linked Shopify storefronts
   - Validate Customer Account API functionality (requires real Shopify connection)
   - Test recipe-specific behavior that only works with linked storefronts
   - Ensure each recipe's unique functionality works correctly with real data
   - Note: Recipes that work with Hydrogen's built-in mock shop are tested separately in Task 9
7. Headless execution is default; a `--headed` flag enables headed debugging.
8. The command automatically installs Playwright browsers if missing.
9. GitHub Actions workflow:
   1. Runs the Smoke Pack on every pull request.
   2. Runs the Full Matrix Pack on every pull request.
   3. Uploads screenshots, videos, network logs, and console traces for failures.
10. The test runner exits non-zero on any failure to block merges.
11. Documentation lives in `docs/testing/e2e.md` and a short section in the root `README.md`.
12. Test debugging artifacts (traces, screenshots, videos, console logs) are captured on failure for easy CI debugging.

## 5. Non-Goals / Out of Scope
* Validating checkout, payment, discount codes, gift cards, or third-party integrations beyond basic checkout page navigation.
* Testing production bundles (`npm run build && npm run preview`).
* Mobile-viewport coverage.
* Performance benchmarking beyond basic timing constraints.
* Testing **all** recipe × permutation combinations (would be 448+ tests).
* Testing with product variants (size, color) or complex cart manipulation scenarios.
* Network failure scenarios and error recovery testing.

## 6. PR Strategy
* **Stack-Based Development**: Use Graphite to manage stacked PRs for incremental development and review.
* **Backfix Approach**: When modifying task lists in earlier branches, carefully manage merge conflicts by:
  - Making changes in the appropriate base branch
  - Rebasing dependent branches after changes
  - Testing full stack integrity before merging
* **PR Size Targets**: Keep PRs under 500 lines changed (ideal ~300 LOC) for reviewability.
* **Sequential Dependencies**: Each PR builds on the previous, creating a clear development narrative.

## 7. Design Considerations
* **Playwright Test Structure**: Place tests under `e2e/`, separate "smoke" vs "matrix" folders.
* **Fixture Strategy**: Use Playwright projects to organize test suites (smoke, matrix, recipes) and data-driven tests to avoid code duplication.
* **CI Matrix**: Start with a single permutation; expand using a matrix once durations are known.
* **Artifacts**: Retain failure artifacts for 30 days in GitHub Actions.
* **Authentication Handling**: To be determined based on Shopify CLI's authentication requirements for testing.

## 8. Technical Considerations
* **Node & npm**: Use the monorepo's pinned versions via Volta or `.nvmrc`.
* **GitHub Runners**: Begin with GitHub-hosted Ubuntu runners; revisit self-hosted/docker if duration becomes an issue.
* **Concurrency**: Limit to 3 parallel workers in CI to balance speed and resource limits.
* **Mock Shop Data**: Hydrogen includes built-in mock shop data that's automatically used when not linked to Shopify. No manual mocking or network stubbing required for non-authenticated tests.
* **Authentication**: For tests requiring Shopify authentication, the mechanism will be determined based on Shopify CLI's testing capabilities and requirements.
* **Network Request Handling**: Use `waitForLoadState('networkidle')` instead of fixed timeouts.

## 9. Success Metrics
* Enhanced Smoke Pack completes in ≤60 s on a standard GitHub runner.
* Full Matrix Pack completes in ≤20 min on CI.
* CLI Command tests complete in <10 min (ideally).
* Recipe tests with authentication complete in <30 min.
* Tests are stable with retry configuration (1 retry) to identify flaky tests while still failing consistently broken tests.
* PRs with failing tests are blocked from merging.
* All tests serve as source of truth for release readiness - passing tests = safe to release.

## 10. Potential Future Directions
* **Mobile Responsiveness Testing**: Add viewport testing for mobile, tablet, and desktop layouts.
* **Product Variant Testing**: Expand cart tests to include different product variants (size, color, etc.).
* **Complex Cart Scenarios**: Test quantity updates, removing items, applying discount codes.
* **Error Recovery Testing**: Test network failures, invalid inputs, and error state handling.
* **Performance Testing**: Add performance benchmarks and regression detection.
* **Visual Regression Testing**: Implement screenshot comparison for UI consistency.
* **Accessibility Testing**: Add automated a11y checks using axe-core or similar.
* **Cross-browser Testing**: Expand beyond Chromium to test Firefox and Safari.
* **Load Testing**: Test application behavior under concurrent user load.
* **API Contract Testing**: Validate GraphQL schema compliance and API responses.

## 11. Open Questions
1. Specific checkout page elements to assert for verification.
2. Desired retention period and storage limits for CI artifacts (screenshots, videos, logs).
3. Whether Dockerized test runners would offer better isolation/performance for the Full Matrix Pack.
4. Authentication mechanism for Shopify CLI commands in test environments (may require test accounts or mock auth).
5. How to version-lock Playwright browsers across local and CI environments to avoid mismatches.
6. Specific assertions needed for each CLI command validation.
7. Whether authenticated tests can run in CI or need manual/local execution only.
