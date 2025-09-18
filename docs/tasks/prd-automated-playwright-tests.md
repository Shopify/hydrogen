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
2. A **Smoke Test Pack** (≤60 s) must:
   1. Run against the repository’s existing skeleton template without scaffolding a new project.
   2. Navigate to `/` and assert the main hero image, product grid, and “Add to Cart” buttons are present with no client/server errors.
   3. Open the cart (should be empty), add the first product, reopen the cart, and assert the product handle appears.
3. A **Full Matrix Pack** must cover the **32 language × styling × scaffold × market-URL permutations** of `npm create @shopify/hydrogen`:
   • Language: JavaScript vs TypeScript
   • Styling library: Tailwind v4, Vanilla Extract, CSS Modules, PostCSS
   • Scaffold routes & core functionality: **Yes** vs **No**
       • If **Yes**, include Markets URL structure: subfolders, subdomains, top-level domains
   Each permutation is scaffolded in a timestamped directory inside `tmp/` using the pattern `hydrogen-<permutation>-<YYYYMMDDHHMMSS>`. These directories are **retained** after the E2E run so developers can manually explore them. When multiple directories exist for the same permutation, the E2E suite runs against the most recently scaffolded one.
4. A **Recipe Test Pack** must validate each available recipe (b2b, bundles, markets, subscriptions, etc.) with 1-2 strategically chosen base permutations that match the recipe's requirements, avoiding combinatorial explosion.
5. Headless execution is default; a `--headed` flag enables headed debugging.
6. The command automatically installs Playwright browsers if missing.
7. GitHub Actions workflow:
   1. Runs the Smoke Pack on every pull request.
   2. Runs the Full Matrix Pack on every pull request.
   3. Uploads screenshots, videos, network logs, and console traces for failures.
8. The test runner exits non-zero on any failure to block merges.
9. Documentation lives in `docs/testing/e2e.md` and a short section in the root `README.md`.
10. Test debugging artifacts (traces, screenshots, videos, console logs) are captured on failure for easy CI debugging.

## 5. Non-Goals / Out of Scope
* Validating checkout, payment, discount codes, gift cards, or third-party integrations.
* Testing production bundles (`npm run build && npm run preview`).
* Mobile-viewport coverage (can be added later).
* Performance benchmarking.
* Testing **all** recipe × permutation combinations (would be 448+ tests).
* Testing production bundles (`npm run build && npm run preview`)

## 6. Design Considerations (Optional)
* **Playwright Test Structure**: Place tests under `e2e/`, separate “smoke” vs “matrix” folders.
* **Fixture Strategy**: Use Playwright projects to organize test suites (smoke, matrix, recipes) and data-driven tests to avoid code duplication.
* **CI Matrix**: Start with a single permutation; expand using a matrix once durations are known.
* **Artifacts**: Retain failure artifacts for 30 days in GitHub Actions.

## 7. Technical Considerations (Optional)
* **Node & npm**: Use the monorepo’s pinned versions via Volta or `.nvmrc`.
* **GitHub Runners**: Begin with GitHub-hosted Ubuntu runners; revisit self-hosted/docker if duration becomes an issue.
* **Concurrency**: Limit to 3 parallel workers in CI to balance speed and resource limits.
* **Secrets**: No secrets required initially (mock shop). Future token use will leverage encrypted GitHub Secrets.

## 8. Success Metrics
* Smoke Pack completes in ≤60 s on a standard GitHub runner.
* Full Matrix Pack completes in ≤20 min on CI.
* Recipe tests complete in reasonable time with strategic permutation selection.
* Tests are stable with retry configuration (1 retry) to identify flaky tests while still failing consistently broken tests.
* PRs with failing tests are blocked from merging.

## 9. Open Questions
1. Exact list of permutations and recipes for phase 2.
2. Desired retention period and storage limits for CI artifacts (screenshots, videos, logs).
3. Whether Dockerized test runners would offer better isolation/performance for the Full Matrix Pack.
4. What specific assertions best signify “page loaded correctly” beyond the initial hero/product grid.
5. How to version-lock Playwright browsers across local and CI environments to avoid mismatches.
