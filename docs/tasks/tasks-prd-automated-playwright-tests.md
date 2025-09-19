## Relevant Files

- `playwright.config.ts` – Playwright configuration with project definitions for test organization.
- `scripts/e2e-setup.sh` – Smart setup script that checks and installs dependencies before E2E tests run.
- `e2e/setup/launch.spec.ts` – System test that verifies dev server launches and displays Hydrogen title.
- `e2e/server.ts` – Helper module for programmatically starting and stopping the dev server.
- `e2e/smoke/` – Directory for fast smoke tests that run against an existing skeleton template.
- `e2e/smoke/home.spec.ts` – Smoke test for home page: hero image, product grid, and console errors.
- `e2e/smoke/cart.spec.ts` – Smoke test for cart functionality: open cart, add product, verify handle.
- `e2e/matrix/` – Directory for full-matrix tests that scaffold permutations of `npm create @shopify/hydrogen`.
- `e2e/recipes/` – Directory for recipe integration tests.
- `package.json` – Adds `e2e` and `e2e:smoke` npm scripts for running tests.
- `.github/workflows/e2e.yml` – GitHub Actions workflow running smoke and full matrix on pull requests only.
- `docs/testing/e2e.md` – Contributor guide for running and debugging Playwright tests.
- `README.md` – Brief section linking to the E2E guide.

### Notes

- Follow Outside-In TDD: write failing tests first, implement minimal code to pass, then refactor.
- Keep each pull request self-contained, reviewable, and **≤500 lines changed** (ideal ≈300 LOC).
- After completing every parent task below, open a new PR targeting `main` in the Hydrogen repository and include instructions for reviewers to run `npm run e2e`.
- All new code must be lint-clean and pass the full test suite in CI.

### Implementation Learnings

#### Test Writing Best Practices
- **Avoid `waitForTimeout`**: Never use fixed timeouts like `waitForTimeout(1500)`. Instead, use `waitForLoadState('networkidle')` combined with explicit waits for expected DOM changes (e.g., `await expect(element).not.toHaveText(oldText)`).
- **Selector Strategy**: The skeleton template uses CSS classes like `.featured-collection`, `.product-item`, `.recommended-products-grid` for key elements. These are stable selectors for smoke tests.
- **Cart Testing**: When testing cart updates, always capture the initial cart count/text first, then wait for it to change after actions rather than assuming a fixed delay.

#### Project Structure Insights
- **Playwright Config Location**: The `playwright.config.ts` is at the root level, not in `e2e/` directory. This is the default Playwright discovery location.
- **WebServer Config**: The webServer configuration in playwright.config.ts successfully starts the dev server for the skeleton template at `templates/skeleton/`.
- **Test Organization**: Tests are organized under `e2e/smoke/` for smoke tests, with `e2e/setup/` for infrastructure verification tests.

#### CI/GitHub Integration
- **CI Timing**: The full CI pipeline takes approximately 5-6 minutes to complete, with unit tests being the longest-running job.
- **Required Checks**: The Hydrogen repo has multiple required checks including TypeScript, ESLint, Prettier, Unit tests, Recipe validation, and Deploy to Oxygen variations.

#### NPM Scripts Pattern
- **E2E Scripts Added**:
  - `"e2e": "playwright test"` - runs all E2E tests
  - `"e2e:smoke": "playwright test --project=smoke"` - runs only smoke tests using Playwright projects
- **Note**: Uses native Playwright projects instead of custom runner script for cleaner, more maintainable commands. All Playwright flags (--headed, --debug, etc.) work naturally with both scripts.

#### Common Pitfalls to Avoid
- **Don't assume npm scripts exist**: Always check `package.json` before trying to run commands like `npm run e2e`.
- **Test timing is critical**: The smoke tests complete in ~9-10 seconds, well under the 60-second requirement.
- **Network idle states**: The skeleton template makes multiple API calls on page load and after cart actions. Always wait for these to complete.

## Tasks

- [x] 1. Establish Playwright infrastructure and baseline configuration (PR #1)

  - [x] 1.1. Write a failing system test in `e2e/setup/launch.spec.ts` that launches the dev server for the existing skeleton template and asserts the root page title contains "Hydrogen". Run with `npx playwright test e2e/setup/launch.spec.ts` and confirm it fails.

  - [x] 1.2. Create `e2e/playwright.config.ts` with a minimal configuration (base URL `http://localhost:3000`, retries 0, reporters = `list`).

  - [x] 1.3. Add `e2e/server.ts` helper that starts and stops the dev server programmatically for tests.

  - [x] 1.4. Implement the minimal code necessary for the launch test to pass (update config, helper, etc.).

  - [x] 1.5. Verify by running `npx playwright test e2e/setup/launch.spec.ts` locally—tests must pass and exit 0.

  - [x] 1.6. Push branch `e2e_infra-baseline` to GitHub, and open PR #1 titled "E2E Infra: Baseline Playwright Setup".

  - [x] 1.7. Wait for the full CI pipeline on PR #1 to complete successfully; fix issues if it fails.

- [x] 2. Build Smoke Test Pack for the existing skeleton template (PR #2)

  - [x] 2.1. Create branch `e2e_smoke-pack` **based on `e2e_infra-baseline`**.

  - [x] 2.2. Write failing smoke tests under `e2e/smoke/`:
      - `home.spec.ts` – asserts hero image, product grid, no console errors.
      - `cart.spec.ts` – opens cart, adds first product, verifies handle appears.

  - [x] 2.3. Run tests to confirm both fail with clear errors.

  - [x] 2.4. Implement assertions and helper utilities to make tests pass without changing application code.

  - [x] 2.5. Verify by running `npx playwright test e2e/smoke` and ensuring the pack completes in <60 s.

  - [x] 2.6. Push branch and open PR #2 titled "E2E: Smoke Test Pack for Skeleton Template". Ensure PR #2 is **stacked on top of PR #1**.

  - [x] 2.7. Wait for CI to finish and pass on PR #2.

- [x] 3. Configure Playwright projects and npm scripts for E2E testing (PR #3)

  - [x] 3.1. Create branch `e2e_npm-scripts` **based on `modify-prd-e2e`**.

  - [x] 3.2. Remove the custom runner script `scripts/run-e2e.js` if it exists (no longer needed with native Playwright projects).

  - [x] 3.3. Update `playwright.config.ts` to define test projects for better organization:
      - Add `smoke` project pointing to `./e2e/smoke` directory
      - Add `setup` project pointing to `./e2e/setup` directory
      - Remove any dynamic `testDir` logic based on environment variables

  - [x] 3.4. Update `package.json` scripts section to add simple E2E commands:
      - Keep existing `"e2e": "playwright test"` to run all tests
      - Update `"e2e:smoke": "playwright test --project=smoke"` to run only smoke tests via project

  - [x] 3.5. Verify the new configuration works with all flag combinations:
      - Run `npm run e2e` to ensure all tests execute
      - Run `npm run e2e:smoke` to ensure only smoke tests run
      - Run `npm run e2e:smoke -- --headed` to verify flags pass through correctly
      - Run `npm run e2e -- --ui` to test Playwright's UI mode works

  - [x] 3.6. **Added E2E setup script for automatic dependency management (2025-09-18)**:
      - Created `scripts/e2e-setup.sh` that intelligently checks and installs dependencies
      - Script only runs `npm install` when package.json or package-lock.json changes (saves time)
      - Always runs `npm run build:pkg` (fast with Turbo caching)
      - Updated `playwright.config.ts` webServer command to use the setup script
      - Ensures E2E tests always have fresh builds while being pragmatic about install times
      - Addresses user feedback about needing to manually run `npm install && npm run build` before tests

  - [x] 3.7. Push branch and open PR #3 titled "E2E: Configure Playwright projects and npm scripts", stacked on top of `modify-prd-e2e`.
      - PR created: https://github.com/Shopify/hydrogen/pull/3181
      - Updated with E2E setup script functionality

  - [x] 3.8. **[DEBUG] Fixed console errors appearing only in Playwright debug mode (2025-09-19)**:
      - **Issue**: Smoke tests failing with 5 console errors when run with `--debug` flag but passing in normal mode
      - **Root cause analysis**:
        1. In debug mode, Playwright injects `<x-pw-glass>` element for its debugging UI
        2. This causes React hydration to fail (server HTML doesn't match client)
        3. When hydration fails, React replaces the entire document
        4. During this replacement, the browser makes a default `favicon.ico` request
        5. Since the skeleton uses `favicon.svg` (not `.ico`), this results in a 404
      - **Evidence gathered**:
        - No actual 404 network request captured by Playwright's network monitoring
        - The error only appears alongside x-pw-glass hydration errors
        - In normal mode, no favicon.ico request is made
        - Created debug tests to isolate and verify the behavior
      - **Solution implemented**: Updated `e2e/smoke/home.spec.ts` to filter out:
        1. Direct x-pw-glass errors
        2. Hydration failures that follow x-pw-glass errors  
        3. The favicon.ico 404 that's a side effect of the hydration failure
      - **Outcome**: Tests now pass in both normal and debug modes while still catching real errors
      - This ensures we're not masking real errors - only the cascade of errors specifically caused by Playwright's debug mode overlay

  - [ ] 3.9. Wait for CI to finish and pass on PR #3.

- [ ] 4. Implement Full Matrix Pack scaffolding and tests for template permutations (3-4 PRs total)

  **Permutation dimensions (32 total):**
  1. **Language**: JavaScript | TypeScript
  2. **Styling**: Tailwind v4 | Vanilla Extract | CSS Modules | PostCSS
  3. **Scaffold routes & core functionality**: Yes | No
     - If **Yes** → additional **Markets URL structure**: Subfolders | Subdomains | Top-level domains

  - [ ] 4.1. **PR #1: Matrix infrastructure and non-scaffolded permutations** (8 permutations)

    - [ ] 4.1.1. Create branch `e2e_matrix-infrastructure` **based on `e2e_npm-scripts`**.

    - [ ] 4.1.2. Write contract tests in `e2e/matrix/contract.spec.ts` defining the expected CLI interface for scaffolding permutations.

    - [ ] 4.1.3. Create scaffolding helper `e2e/matrix/scaffold.ts` that:
        - Invokes `npm create @shopify/hydrogen` with given flags
        - Creates projects in `tmp/` with pattern `hydrogen-<permutation>-<YYYYMMDDHHMMSS>`
        - Returns the project path for testing
        - Selects most recent project when duplicates exist

    - [ ] 4.1.4. Ensure `tmp/` directory is listed in `.gitignore`.

    - [ ] 4.1.5. Create data-driven test structure in `e2e/matrix/non-scaffolded.spec.ts`:
        - Define test matrix for 8 non-scaffolded permutations (2 languages × 4 styling options)
        - Use `test.describe.parallel` for concurrent execution
        - Share common assertions (page loads, cart works, no errors)

    - [ ] 4.1.6. Configure Playwright project for matrix tests in `playwright.config.ts`.

    - [ ] 4.1.7. Verify locally with `npm run e2e -- --project=matrix` and ensure all 8 permutations pass.

    - [ ] 4.1.8. Push branch and open PR titled "E2E Matrix: Infrastructure and non-scaffolded permutations".

    - [ ] 4.1.9. Wait for CI to pass on PR.

  - [ ] 4.2. **PR #2: Scaffolded permutations without markets** (8 permutations)

    - [ ] 4.2.1. Create branch `e2e_matrix-scaffolded-basic` **based on `e2e_matrix-infrastructure`**.

    - [ ] 4.2.2. Create `e2e/matrix/scaffolded-basic.spec.ts` with data-driven tests:
        - Define test matrix for 8 scaffolded permutations without markets
        - Reuse assertion helpers from infrastructure PR
        - Test additional scaffolded routes (products, collections, etc.)

    - [ ] 4.2.3. Extend scaffold helper to handle scaffolded route options.

    - [ ] 4.2.4. Verify locally with `npm run e2e -- --project=matrix` for new permutations.

    - [ ] 4.2.5. Push branch and open PR titled "E2E Matrix: Scaffolded permutations without markets", stacked on PR #1.

    - [ ] 4.2.6. Wait for CI to pass on PR.

  - [ ] 4.3. **PR #3: Scaffolded permutations with markets** (16 permutations)

    - [ ] 4.3.1. Create branch `e2e_matrix-scaffolded-markets` **based on `e2e_matrix-scaffolded-basic`**.

    - [ ] 4.3.2. Create `e2e/matrix/scaffolded-markets.spec.ts` with data-driven tests:
        - Define test matrix for 16 permutations (2 languages × 4 styling × 2 market structures)
        - Note: Only test 2 market structures to keep PR manageable
        - Test market-specific routing and URL patterns

    - [ ] 4.3.3. Extend scaffold helper to handle market URL structure options.

    - [ ] 4.3.4. Add performance timing to track total matrix runtime.

    - [ ] 4.3.5. Verify locally and ensure total matrix runtime stays under 20 minutes.

    - [ ] 4.3.6. Push branch and open PR titled "E2E Matrix: Scaffolded permutations with markets", stacked on PR #2.

    - [ ] 4.3.7. Wait for CI to pass on PR.

  - [ ] 4.4. **Verify full matrix performance**

    - [ ] 4.4.1. After all matrix PRs are merged, run full matrix locally (`npm run e2e -- --project=matrix`).

    - [ ] 4.4.2. Confirm total runtime ≤20 min; if not, optimize test parallelization or reduce coverage.

- [ ] 5. Test recipe integrations with selected permutations (2 PRs total)

  **Available recipes (14 total):** b2b, bundles, combined-listings, custom-cart-method, express, gtm, infinite-scroll, legacy-customer-account-flow, markets, metaobjects, multipass, partytown, subscriptions, third-party-api

  **Strategy:** Test each recipe with 1-2 carefully chosen base permutations that match the recipe's requirements, avoiding combinatorial explosion.

  - [ ] 5.1. **PR #1: Recipe testing infrastructure**

    - [ ] 5.1.1. Create branch `e2e_recipe-infrastructure` **based on the last merged matrix branch**.

    - [ ] 5.1.2. Create recipe discovery helper in `e2e/recipes/discover.ts` that:
        - Scans `cookbook/recipes/` directory for available recipes
        - Validates recipe metadata and requirements
        - Returns list of testable recipes

    - [ ] 5.1.3. Create recipe application helper in `e2e/recipes/apply.ts` that:
        - Takes a scaffolded project path and recipe name
        - Applies the recipe using the appropriate CLI command
        - Validates successful recipe application

    - [ ] 5.1.4. Create base test structure in `e2e/recipes/recipe-base.spec.ts` with:
        - Common assertions for recipe-applied projects
        - Helper functions for recipe-specific validations
        - Shared setup/teardown logic

    - [ ] 5.1.5. Configure Playwright project for recipe tests in `playwright.config.ts`.

    - [ ] 5.1.6. Push branch and open PR titled "E2E Recipe: Testing infrastructure".

    - [ ] 5.1.7. Wait for CI to pass on PR.

  - [ ] 5.2. **PR #2: Recipe test implementations**

    - [ ] 5.2.1. Create branch `e2e_recipe-tests` **based on `e2e_recipe-infrastructure`**.

    - [ ] 5.2.2. Create `e2e/recipes/recipe-tests.spec.ts` with data-driven tests mapping recipes to appropriate base permutations:
        - **markets**: TypeScript + Tailwind + scaffolded + subfolders (tests internationalization)
        - **b2b**: TypeScript + Tailwind + scaffolded (enterprise features need types)
        - **subscriptions**: TypeScript + scaffolded (needs product routes)
        - **bundles/combined-listings**: JavaScript + scaffolded (needs product structure)
        - **third-party-api**: TypeScript + non-scaffolded (API integrations benefit from types)
        - **gtm/partytown**: JavaScript + non-scaffolded (analytics work on minimal setup)
        - **Other recipes**: 1 appropriate permutation each based on recipe requirements

    - [ ] 5.2.3. Implement recipe-specific validations:
        - Verify recipe files are properly integrated
        - Check that recipe-specific routes work
        - Validate recipe configuration is applied

    - [ ] 5.2.4. Add performance monitoring to ensure recipe tests complete within reasonable time.

    - [ ] 5.2.5. Verify locally with `npm run e2e -- --project=recipes` and ensure all recipes test successfully.

    - [ ] 5.2.6. Push branch and open PR titled "E2E Recipe: Test implementations", stacked on PR #1.

    - [ ] 5.2.7. Wait for CI to pass on PR.

- [ ] 6. Write contributor documentation for running and debugging the test suite (PR)

  - [ ] 6.1. Create branch `docs_e2e-guide` **based on the last merged recipe branch**.

  - [ ] 6.2. Create `docs/testing/e2e.md` with setup instructions, flags (`--smoke`, `--matrix`, `--headed`), and CI guidance.

  - [ ] 6.3. Add a short section to the project `README.md` linking to the guide.

  - [ ] 6.4. Verify by running `npm run lint` and checking links work in rendered Markdown.

  - [ ] 6.5. Push branch and open PR titled "Docs: E2E Testing Guide", stacked on top of the last matrix PR.

  - [ ] 6.6. Wait for CI to pass on PR.

- [ ] 7. Configure test debugging and performance safeguards (PR)

  - [ ] 7.1. Create branch `e2e_debugging-config` **based on `docs_e2e-guide`**.

  - [ ] 7.2. Configure Playwright to capture comprehensive debugging artifacts on failure:
      - Enable trace recording on first retry
      - Capture full-page screenshots on failure
      - Record videos for failed tests
      - Preserve console logs and network activity

  - [ ] 7.3. Configure Playwright's `expect` timeout and `testTimeout` defaults to keep Smoke Pack ≤60 s and Full Matrix ≤20 min.

  - [ ] 7.4. Add retry configuration (1 retry) to help identify flaky tests while still failing consistently broken tests.

  - [ ] 7.5. Configure reporter to output detailed error messages with stack traces in CI:
      - Use 'list' reporter for local runs
      - Use 'html' reporter for CI with embedded traces
      - Include test step details in output

  - [ ] 7.6. Verify by introducing an intentional test failure locally, ensuring all debugging artifacts are generated, then fixing it.

  - [ ] 7.7. Push branch and open PR titled "E2E: Configure debugging and performance safeguards", stacked on top of documentation PR.

  - [ ] 7.8. Wait for CI to finish and pass on PR.

- [ ] 8. Add CI workflow for Smoke Pack (PR)

  - [ ] 8.1. Create branch `e2e_ci-smoke` **based on `e2e_debugging-config`**.

  - [ ] 8.2. Create `.github/workflows/e2e.yml` workflow that runs `npm run e2e:smoke` on `pull_request` events only.

  - [ ] 8.3. Configure workflow to upload artifacts (screenshots, videos, traces) on test failures.

  - [ ] 8.4. Add a step that fails if the Smoke Pack exceeds 60 seconds runtime.

  - [ ] 8.5. Verify workflow by pushing a draft PR—CI must pass and upload artifacts on failure.

  - [ ] 8.6. Push branch and open PR titled "CI: Run Smoke Pack in Pull Requests", stacked on top of debugging config PR.

  - [ ] 8.7. Await CI completion on PR.

- [ ] 9. Extend CI workflow to include the Full Matrix Pack in regular CI runs (PR)

  - [ ] 9.1. Create branch `e2e_ci-full-matrix` **based on `e2e_ci-smoke`**.

  - [ ] 9.2. Update `.github/workflows/e2e.yml` to run the full matrix (`npm run e2e -- --project=matrix`) on `pull_request` events with a job strategy (3 parallel workers, 20-min timeout).

  - [ ] 9.3. Ensure failure artifacts (screenshots, videos, logs) are uploaded for any failing matrix job.

  - [ ] 9.4. Add a step that monitors overall matrix runtime and warns if approaching 20-minute limit.

  - [ ] 9.5. Verify locally and push branch; open PR titled "CI: Full Matrix Pack", stacked on top of the smoke CI PR.

  - [ ] 9.6. Wait for CI to pass on PR.
