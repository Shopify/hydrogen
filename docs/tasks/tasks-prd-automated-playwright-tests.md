## Relevant Files

- `playwright.config.ts` – Playwright configuration with project definitions for test organization.
- `scripts/e2e-setup.sh` – Smart setup script that checks and installs dependencies before E2E tests run.
- `e2e/setup/launch.spec.ts` – System test that verifies dev server launches and displays Hydrogen title.
- `e2e/server.ts` – Helper module for programmatically starting and stopping the dev server.
- `e2e/helpers/ejson-secrets.ts` – Helper for decrypting/encrypting ejson secrets for authenticated tests.
- `e2e/smoke/` – Directory for fast smoke tests that run against an existing skeleton template.
- `e2e/smoke/home.spec.ts` – Smoke test for home page: hero image, product grid, and console errors.
- `e2e/smoke/cart.spec.ts` – Smoke test for cart functionality: open cart, add product, verify handle.
- `e2e/matrix/` – Directory for full-matrix tests that scaffold permutations of `npm create @shopify/hydrogen`.
- `e2e/recipes/` – Directory for recipe integration tests.
- `e2e/cli/` – Directory for CLI command tests including authenticated flows.
- `secrets.ejson` – Encrypted secrets file containing test account credentials.
- `package.json` – Adds `e2e` and `e2e:smoke` npm scripts for running tests.
- `.github/workflows/e2e.yml` – GitHub Actions workflow running smoke and full matrix on pull requests only.
- `docs/testing/e2e.md` – Contributor guide for running and debugging Playwright tests.
- `README.md` – Brief section linking to the E2E guide.

### Notes

- Follow Outside-In TDD: write failing tests first, implement minimal code to pass, then refactor.
- Keep each pull request self-contained, reviewable, and **≤500 lines changed** (ideal ≈300 LOC).
- After completing every parent task below, open a new PR targeting `main` in the Hydrogen repository and include instructions for reviewers to run `npm run e2e`.
- All new code must be lint-clean and pass the full test suite in CI.

#### Ejson Setup for Authenticated Tests

- **Prerequisites**: Developers must have the ejson private key installed. Obtain it via hush link from team members and run `./scripts/setup-ejson-private-key.sh` with the key in your clipboard.
- **Adding Secrets**: Both email address and password are treated as encrypted secrets for enhanced security. When adding test credentials:
  - The implementing developer will be prompted for credentials when ready
  - Add both email and password to `secrets.ejson` as encrypted fields
  - Run `npm run encrypt` to encrypt them before committing
- **Decryption in Tests**: Use `ejson decrypt secrets.ejson` to decrypt in-place, then read both credentials directly from the modified file.
- **Re-encryption**: Always run `ejson encrypt secrets.ejson` after tests to restore encrypted state.
- **Security**: Never commit decrypted secrets. Both email and password must remain encrypted. The pre-commit hook automatically encrypts if `secrets.ejson` is staged.
- **CI Setup**: GitHub Actions will need the ejson private key configured as a repository secret.

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
- **Ejson state management**: Always verify `secrets.ejson` is encrypted before committing. The file is modified in-place during decryption.
- **Missing private key**: Tests will fail if the ejson private key isn't installed. Check `/opt/ejson/keys/` for the key file.

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

- [ ] 3. Configure Playwright projects and npm scripts for E2E testing (PR #3)

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

- [ ] 4. Test authenticated Hydrogen CLI commands with Shopify integration (PR #4)

  - [ ] 4.1. Create branch `e2e_cli-authenticated` **based on `e2e_npm-scripts`**.

  - [ ] 4.2. Set up ejson secrets for test authentication:
      - **SECURITY NOTE**: Both email address and password will be treated as encrypted secrets
      - Prompt user for test account credentials when ready to configure
      - Add both email address and password to `secrets.ejson` as encrypted fields
      - Run `npm run encrypt` to ensure all credentials are properly encrypted
      - Verify that both email and password fields are encrypted in the file
      - Commit the encrypted `secrets.ejson` file

  - [ ] 4.3. Create ejson decryption helper `e2e/helpers/ejson-secrets.ts`:
      - Write failing test to verify ejson decryption works
      - Implement function to run `ejson decrypt secrets.ejson` command
      - Parse decrypted JSON to extract both email and password securely
      - Ensure both credentials are handled as sensitive data throughout
      - Implement function to re-encrypt with `ejson encrypt secrets.ejson`
      - Add error handling for missing private key scenarios
      - Never log or expose decrypted email or password values

  - [ ] 4.4. Write failing test suite `e2e/cli/auth-setup.spec.ts` for basic auth:
      - Define expected behavior for login/logout operations
      - Define expected behavior for link/unlink operations
      - These are foundational tests that establish auth for all subsequent tests
      - Run tests to confirm they fail appropriately

  - [ ] 4.5. Set up test authentication environment:
      - Use ejson helper to decrypt and load both email and password
      - Create helper for managing auth state with both decrypted credentials
      - Ensure neither email nor password are exposed in logs or error messages
      - Implement cleanup to reset auth between tests
      - Ensure all secrets are re-encrypted after test completion

  - [ ] 4.6. Implement basic `hydrogen login` and `hydrogen logout` tests:
      - Decrypt secrets using ejson helper to get both email and password
      - Run `npm exec shopify hydrogen login` with test credentials
      - Handle authentication flow with both decrypted email and password
      - Ensure neither credential is logged during the process
      - Verify successful login
      - Test `hydrogen logout` and verify clean logout
      - Re-encrypt all secrets after test completion

  - [ ] 4.7. Implement basic `hydrogen link` and `hydrogen unlink` tests:
      - Ensure logged in state from previous test
      - Run `npm exec shopify hydrogen link`
      - Select or create test storefront in Shopify admin
      - Verify linking completes successfully
      - Test `hydrogen unlink` and verify clean unlinking
      - Re-link for use by subsequent tests

  - [ ] 4.8. Write failing test suite `e2e/cli/authenticated-commands.spec.ts` for remaining commands:
      - Define expected behavior for all other authenticated commands
      - Will use the auth established by auth-setup.spec.ts
      - Run tests to confirm they fail appropriately

  - [ ] 4.9. Implement `hydrogen customer-account-push` test:
      - Ensure project is linked
      - Run `npm exec shopify hydrogen customer-account-push`
      - Verify Customer Account API configuration pushed
      - Check for success confirmation

  - [ ] 4.10. Implement `hydrogen deploy` test:
      - Ensure project is linked and built
      - Run `npm exec shopify hydrogen deploy`
      - Verify deployment initiates (may use test/staging)
      - Check deployment status output

  - [ ] 4.11. Implement environment variable management tests:
      - Test `npm exec shopify hydrogen env list`
      - Test `npm exec shopify hydrogen env pull`
      - Test `npm exec shopify hydrogen env push`
      - Verify environment variables sync correctly

  - [ ] 4.12. Implement `hydrogen list` test:
      - Run `npm exec shopify hydrogen list`
      - Verify linked storefronts are displayed
      - Check output format and information

  - [ ] 4.13. Verify authenticated flow persistence:
      - Ensure login persists across test runs
      - Ensure link persists for use by Tasks 6 and 8
      - Document how to reset auth state if needed

  - [ ] 4.14. Add authentication test utilities:
      - Create assertion helpers for auth state
      - Add cleanup functions for test isolation
      - Implement safeguards to prevent committing decrypted secrets
      - Add git pre-commit hook to verify secrets.ejson is encrypted
      - Ensure both email and password remain encrypted in the repository
      - Add validation that neither credential appears in plain text in any file

  - [ ] 4.15. Verify authenticated CLI tests complete in reasonable time (<30 minutes).

  - [ ] 4.16. Push branch and open PR titled "E2E: Authenticated CLI commands", stacked on previous PR.

  - [ ] 4.17. Wait for CI to finish and pass on PR.

- [ ] 5. Test Hydrogen CLI commands for core functionality (PR #5)

  - [ ] 5.1. Create branch `e2e_cli-commands` **based on the last merged matrix branch**.

  - [ ] 5.2. Write failing test suite `e2e/cli/core-commands.spec.ts` defining expected CLI behavior:
      - Define expected output and behavior for each command
      - Tests will use Hydrogen's built-in mock shop (automatically active when not linked)
      - Include both success and error scenarios
      - Run tests to confirm they fail with clear error messages

  - [ ] 5.3. Implement `hydrogen build` test:
      - Scaffold a minimal project for testing
      - Run `npm exec shopify hydrogen build`
      - Verify build completes successfully
      - Check for expected output files in `dist/`
      - Assert no error output

  - [ ] 5.4. Implement `hydrogen check` test:
      - Run `npm exec shopify hydrogen check` on test project
      - Verify code checking completes
      - Parse output for validation results
      - Test with both valid and invalid code scenarios

  - [ ] 5.5. Implement `hydrogen codegen` test:
      - Create test GraphQL files with queries
      - Run `npm exec shopify hydrogen codegen`
      - Verify generated TypeScript types exist
      - Check that generated files match expected patterns

  - [ ] 5.6. Implement `hydrogen debug cpu` test:
      - Start `npm exec shopify hydrogen debug cpu` in background
      - Wait for GUI server to start
      - Verify server is accessible on expected port
      - Check for CPU profiling interface elements
      - Cleanly terminate the debug session

  - [ ] 5.7. Implement `hydrogen dev` test:
      - Run `npm exec shopify hydrogen dev` with test project
      - Wait for dev server to start
      - Verify server responds on localhost:3000
      - Test hot reload functionality
      - Cleanly shutdown dev server

  - [ ] 5.8. Implement `hydrogen preview` test:
      - Build project first with `hydrogen build`
      - Run `npm exec shopify hydrogen preview`
      - Verify preview server starts
      - Test that built assets are served correctly
      - Verify differs from dev server behavior

  - [ ] 5.9. Implement `hydrogen shortcut` test:
      - Run `npm exec shopify hydrogen shortcut`
      - Verify shortcut functionality works
      - Test with various shortcut scenarios
      - Assert expected behavior for each shortcut

  - [ ] 5.10. Implement `hydrogen upgrade` test:
      - Create project with older dependencies
      - Run `npm exec shopify hydrogen upgrade`
      - Verify NPM dependencies are modified
      - Check for follow-up instructions generation
      - Verify upgrade completes without errors
      - Test that project still builds after upgrade

  - [ ] 5.11. Add test helpers and utilities:
      - Create CLI output parsing utilities
      - Add process management helpers
      - Create assertion helpers for CLI-specific checks

  - [ ] 5.12. Verify all CLI tests complete in <10 minutes locally.

  - [ ] 5.13. Push branch and open PR titled "E2E: CLI command tests", stacked appropriately.

  - [ ] 5.14. Wait for CI to finish and pass on PR.

- [ ] 6. Enhance smoke tests with comprehensive user journey testing (PR #6)

  - [ ] 6.1. Create branch `e2e_enhanced-smoke` **based on `e2e_cli-authenticated`**.

  - [ ] 6.2. **Update existing `e2e/smoke/home.spec.ts` to use linked storefront**:
      - Modify test to use the linked Shopify storefront from Task 4
      - Update assertions to work with real shop data
      - Ensure test still validates hero image, product grid, and console errors
      - Verify the test passes with linked storefront

  - [ ] 6.3. Write failing test `e2e/smoke/user-journey.spec.ts` defining complete user flow:
      - Test should navigate from homepage → collections → product → cart → checkout
      - Define expected elements and behaviors at each step
      - Include assertions for cart quantity changes and price updates
      - Run test to confirm it fails with clear error messages

  - [ ] 6.4. **Set up authenticated environment for user journey test**:
      - Import ejson helper from Task 4 implementation
      - Decrypt secrets to get both email and password credentials
      - Use the linked storefront established in Task 4
      - Ensure hydrogen login is active with both decrypted credentials
      - Verify link to Hydrogen storefront is configured
      - All tests run against real Shopify data, not mock shop
      - Re-encrypt all secrets after test setup

  - [ ] 6.5. Implement homepage verification:
      - Wait for all network requests using `waitForLoadState('networkidle')`
      - Assert no console errors
      - Verify key homepage elements are present

  - [ ] 6.6. Implement cart state capture:
      - Open cart drawer/modal
      - Capture initial quantities (empty or existing items)
      - Create helper to parse cart state

  - [ ] 6.7. Implement collections navigation:
      - Navigate to `/collections` page
      - Wait for product grid to load
      - Verify collection page elements

  - [ ] 6.8. Implement product selection and navigation:
      - Click first product in collection grid
      - Verify navigation to product detail page (URL pattern `/products/*`)
      - Assert product page elements loaded

  - [ ] 6.9. Implement add to cart functionality:
      - Click "Add to Cart" button
      - Wait for cart update network requests
      - Avoid fixed timeouts, use proper wait conditions

  - [ ] 6.10. Implement cart verification:
      - Open cart again
      - Verify item quantity increased
      - Assert price updated correctly
      - Create helper for price comparison

  - [ ] 6.11. Implement checkout navigation:
      - Locate checkout button
      - Verify button exists and is clickable
      - Click checkout button
      - Wait for navigation to checkout page

  - [ ] 6.12. Implement checkout page verification:
      - Assert URL contains checkout pattern
      - Verify checkout form elements (shipping, payment sections)
      - Ensure no errors during checkout page load

  - [ ] 6.13. Add test helpers and utilities:
      - Create reusable functions for common actions
      - Add price parsing utilities
      - Create cart state comparison helpers

  - [ ] 6.14. Verify enhanced smoke tests complete in ≤60 seconds locally.

  - [ ] 6.15. Push branch and open PR #6 titled "E2E: Enhanced smoke tests with user journey", stacked on `e2e_npm-scripts`.

  - [ ] 6.16. Wait for CI to finish and pass on PR #6.

- [ ] 7. Implement Full Matrix Pack scaffolding and tests for template permutations (3-4 PRs total)

  **IMPORTANT**: This task MUST scaffold ALL permutations. The scaffolding is intentionally comprehensive despite being slow - this is the entire purpose of the matrix tests.

  **Permutation dimensions (32 total):**
  1. **Language**: JavaScript | TypeScript
  2. **Styling**: Tailwind v4 | Vanilla Extract | CSS Modules | PostCSS
  3. **Scaffold routes & core functionality**: Yes | No
     - If **Yes** → additional **Markets URL structure**: Subfolders | Subdomains | Top-level domains

  **All permutations will use the linked Shopify storefront from Task 4, not mock shop data.**

  - [ ] 7.1. **PR #1: Matrix infrastructure and non-scaffolded permutations** (8 permutations - ALL MUST BE SCAFFOLDED)

    - [ ] 7.1.1. Create branch `e2e_matrix-infrastructure` **based on `e2e_enhanced-smoke`**.

    - [ ] 7.1.2. Write contract tests in `e2e/matrix/contract.spec.ts` defining the expected CLI interface for scaffolding permutations.

    - [ ] 7.1.3. Create scaffolding helper `e2e/matrix/scaffold.ts` that:
        - Invokes `npm create @shopify/hydrogen` with given flags
        - **MUST actually scaffold each project** - no shortcuts or mocking
        - Creates projects in `tmp/` with pattern `hydrogen-<permutation>-<YYYYMMDDHHMMSS>`
        - Returns the project path for testing
        - Selects most recent project when duplicates exist
        - Uses linked Shopify storefront credentials from Task 4

    - [ ] 7.1.4. Ensure `tmp/` directory is listed in `.gitignore`.

    - [ ] 7.1.5. Create data-driven test structure in `e2e/matrix/non-scaffolded.spec.ts`:
        - Define test matrix for 8 non-scaffolded permutations (2 languages × 4 styling options)
        - **Each permutation MUST be fully scaffolded using `npm create @shopify/hydrogen`**
        - Use `test.describe.parallel` for concurrent execution
        - Share common assertions (page loads, cart works, no errors)
        - All tests run against linked Shopify storefront, not mock data

    - [ ] 7.1.6. Configure Playwright project for matrix tests in `playwright.config.ts`.

    - [ ] 7.1.7. Verify locally with `npm run e2e -- --project=matrix` and ensure all 8 permutations pass.

    - [ ] 7.1.8. Push branch and open PR titled "E2E Matrix: Infrastructure and non-scaffolded permutations".

    - [ ] 7.1.9. Wait for CI to pass on PR.

  - [ ] 7.2. **PR #2: Scaffolded permutations without markets** (8 permutations - ALL MUST BE SCAFFOLDED)

    - [ ] 7.2.1. Create branch `e2e_matrix-scaffolded-basic` **based on `e2e_matrix-infrastructure`**.

    - [ ] 7.2.2. Create `e2e/matrix/scaffolded-basic.spec.ts` with data-driven tests:
        - Define test matrix for 8 scaffolded permutations without markets
        - **Each permutation MUST be fully scaffolded** - this is the core requirement
        - Reuse assertion helpers from infrastructure PR
        - Test additional scaffolded routes (products, collections, etc.)
        - Use linked Shopify storefront for all tests

    - [ ] 7.2.3. Extend scaffold helper to handle scaffolded route options.

    - [ ] 7.2.4. Verify locally with `npm run e2e -- --project=matrix` for new permutations.

    - [ ] 7.2.5. Push branch and open PR titled "E2E Matrix: Scaffolded permutations without markets", stacked on PR #1.

    - [ ] 7.2.6. Wait for CI to pass on PR.

  - [ ] 7.3. **PR #3: Scaffolded permutations with markets** (16 permutations - ALL MUST BE SCAFFOLDED)

    - [ ] 7.3.1. Create branch `e2e_matrix-scaffolded-markets` **based on `e2e_matrix-scaffolded-basic`**.

    - [ ] 7.3.2. Create `e2e/matrix/scaffolded-markets.spec.ts` with data-driven tests:
        - Define test matrix for 16 permutations (2 languages × 4 styling × 2 market structures)
        - Note: Only test 2 market structures to keep PR manageable
        - Test market-specific routing and URL patterns

    - [ ] 7.3.3. Extend scaffold helper to handle market URL structure options.

    - [ ] 7.3.4. Add performance timing to track total matrix runtime.

    - [ ] 7.3.5. Verify locally and ensure total matrix runtime stays under 20 minutes.

    - [ ] 7.3.6. Push branch and open PR titled "E2E Matrix: Scaffolded permutations with markets", stacked on PR #2.

    - [ ] 7.3.7. Wait for CI to pass on PR.

  - [ ] 7.4. **Verify full matrix performance**

    - [ ] 7.4.1. After all matrix PRs are merged, run full matrix locally (`npm run e2e -- --project=matrix`).

    - [ ] 7.4.2. Confirm total runtime ≤20 min; if not, optimize test parallelization or reduce coverage.

- [ ] 8. Test recipe functionality with real shop data and authentication (PR #7)

  - [ ] 8.1. Create branch `e2e_recipes-authenticated` **based on `e2e_cli-authenticated`**.

  - [ ] 8.2. Write failing test suite `e2e/recipes/authenticated-recipes.spec.ts`:
      - Define expected behavior for recipes requiring real data
      - Plan which recipes need authentication vs mock data
      - Run tests to confirm they fail appropriately

  - [ ] 8.3. Set up authenticated test environment:
      - Import ejson helper from Task 4 implementation
      - Decrypt secrets to get both email and password credentials
      - Ensure Shopify authentication is configured with both decrypted credentials
      - Link to test storefront with appropriate data
      - Configure Customer Account API access
      - Re-encrypt all secrets after environment setup

  - [ ] 8.4. Identify recipes requiring authentication:
      - Review each recipe's requirements
      - Categorize: works with mock vs needs real shop
      - Document requirements for each recipe

  - [ ] 8.5. Implement Customer Account API recipe tests:
      - Apply customer account recipe
      - Test customer login flow
      - Verify account pages work correctly
      - Test customer-specific features

  - [ ] 8.6. Implement B2B recipe tests:
      - Apply B2B recipe to test project
      - Verify B2B-specific features work
      - Test with company accounts if available
      - Verify wholesale pricing features

  - [ ] 8.7. Implement Markets recipe tests:
      - Apply markets recipe
      - Test multi-market functionality
      - Verify currency/language switching
      - Test market-specific routing

  - [ ] 8.8. Implement Subscriptions recipe tests:
      - Apply subscriptions recipe
      - Test subscription product display
      - Verify selling plan functionality
      - Test subscription management UI

  - [ ] 8.9. Test other authenticated recipes:
      - For each recipe requiring real data
      - Apply recipe and verify functionality
      - Test recipe-specific features work correctly
      - Ensure no conflicts with base functionality

  - [ ] 8.10. Add Customer Account API specific tests:
      - Test account creation flow
      - Verify order history display
      - Test address management
      - Verify account settings work

  - [ ] 8.11. Create recipe test utilities:
      - Helper for applying recipes programmatically
      - Assertion helpers for recipe-specific features
      - Data setup utilities for test scenarios

  - [ ] 8.12. Verify all authenticated recipe tests complete in <30 minutes.

  - [ ] 8.13. Push branch and open PR titled "E2E: Authenticated recipe tests", stacked appropriately.

  - [ ] 8.14. Wait for CI to finish and pass on PR.

- [ ] 9. Test recipe integrations with selected permutations (2 PRs total)

  **Available recipes (14 total):** b2b, bundles, combined-listings, custom-cart-method, express, gtm, infinite-scroll, legacy-customer-account-flow, markets, metaobjects, multipass, partytown, subscriptions, third-party-api

  **Strategy:** Test recipes using Hydrogen's built-in mock shop data (automatically active when project is not linked to Shopify), using 1-2 carefully chosen base permutations that match the recipe's requirements. Recipes requiring real Shopify shop data are covered in Task 8.

  - [ ] 9.1. **PR #1: Recipe testing infrastructure**

    - [ ] 9.1.1. Create branch `e2e_recipe-infrastructure` **based on the last merged matrix branch**.

    - [ ] 9.1.2. Create recipe discovery helper in `e2e/recipes/discover.ts` that:
        - Scans `cookbook/recipes/` directory for available recipes
        - Validates recipe metadata and requirements
        - Returns list of testable recipes

    - [ ] 9.1.3. Create recipe application helper in `e2e/recipes/apply.ts` that:
        - Takes a scaffolded project path and recipe name
        - Applies the recipe using the appropriate CLI command
        - Validates successful recipe application

    - [ ] 9.1.4. Create base test structure in `e2e/recipes/recipe-base.spec.ts` with:
        - Common assertions for recipe-applied projects
        - Helper functions for recipe-specific validations
        - Shared setup/teardown logic

    - [ ] 9.1.5. Configure Playwright project for recipe tests in `playwright.config.ts`.

    - [ ] 9.1.6. Push branch and open PR titled "E2E Recipe: Testing infrastructure".

    - [ ] 9.1.7. Wait for CI to pass on PR.

  - [ ] 9.2. **PR #2: Recipe test implementations with mock data**

    - [ ] 9.2.1. Create branch `e2e_recipe-tests` **based on `e2e_recipe-infrastructure`**.

    - [ ] 9.2.2. Create `e2e/recipes/builtin-shop-recipe-tests.spec.ts` with data-driven tests for recipes that work with Hydrogen's built-in mock shop:
        - **custom-cart-method**: JavaScript + scaffolded (tests cart customization)
        - **express**: TypeScript + non-scaffolded (tests express integration)
        - **gtm/partytown**: JavaScript + non-scaffolded (analytics work on minimal setup)
        - **infinite-scroll**: JavaScript + scaffolded (tests pagination)
        - **metaobjects**: TypeScript + scaffolded (tests custom content types)
        - **multipass**: TypeScript + non-scaffolded (tests SSO integration)
        - **third-party-api**: TypeScript + non-scaffolded (API integrations benefit from types)
        - **Other mock-compatible recipes**: 1 appropriate permutation each

    - [ ] 9.2.3. Implement recipe-specific validations for recipes using built-in mock shop:
        - Verify recipe files are properly integrated
        - Check that recipe-specific routes work
        - Validate recipe configuration is applied

    - [ ] 9.2.4. Add performance monitoring to ensure recipe tests complete within reasonable time.

    - [ ] 9.2.5. Verify locally with `npm run e2e -- --project=recipes` and ensure all built-in mock shop recipes test successfully.

    - [ ] 9.2.6. Push branch and open PR titled "E2E Recipe: Built-in mock shop test implementations", stacked on PR #1.

    - [ ] 9.2.7. Wait for CI to pass on PR.

- [ ] 10. Write contributor documentation for running and debugging the test suite (PR)

  - [ ] 10.1. Create branch `docs_e2e-guide` **based on the last merged recipe branch**.

  - [ ] 10.2. Create `docs/testing/e2e.md` with comprehensive documentation:
      - Setup instructions for local development
      - All test suite types (smoke, matrix, cli, authenticated, recipes)
      - Command flags and options
      - CI/CD integration guidance
      - Debugging tips and troubleshooting
      - Authentication setup for Shopify-linked tests

  - [ ] 10.3. Add a short section to the project `README.md` linking to the guide.

  - [ ] 10.4. Verify by running `npm run lint` and checking links work in rendered Markdown.

  - [ ] 10.5. Push branch and open PR titled "Docs: E2E Testing Guide", stacked appropriately.

  - [ ] 10.6. Wait for CI to pass on PR.

- [ ] 11. Configure test debugging and performance safeguards (PR)

  - [ ] 11.1. Create branch `e2e_debugging-config` **based on `docs_e2e-guide`**.

  - [ ] 11.2. Configure Playwright to capture comprehensive debugging artifacts on failure:
      - Enable trace recording on first retry
      - Capture full-page screenshots on failure
      - Record videos for failed tests
      - Preserve console logs and network activity

  - [ ] 11.3. Configure Playwright's `expect` timeout and `testTimeout` defaults:
      - Enhanced Smoke Pack ≤60 s
      - Full Matrix ≤20 min
      - CLI tests <10 min
      - Authenticated tests <30 min

  - [ ] 11.4. Add retry configuration (1 retry) to help identify flaky tests while still failing consistently broken tests.

  - [ ] 11.5. Configure reporter to output detailed error messages with stack traces in CI:
      - Use 'list' reporter for local runs
      - Use 'html' reporter for CI with embedded traces
      - Include test step details in output

  - [ ] 11.6. Verify by introducing an intentional test failure locally, ensuring all debugging artifacts are generated, then fixing it.

  - [ ] 11.7. Push branch and open PR titled "E2E: Configure debugging and performance safeguards", stacked on top of documentation PR.

  - [ ] 11.8. Wait for CI to finish and pass on PR.

- [ ] 12. Add CI workflow for Smoke Pack (PR)

  - [ ] 12.1. Create branch `e2e_ci-smoke` **based on `e2e_debugging-config`**.

  - [ ] 12.2. Create `.github/workflows/e2e.yml` workflow that runs `npm run e2e:smoke` on `pull_request` events only.

  - [ ] 12.3. Configure workflow to upload artifacts (screenshots, videos, traces) on test failures.

  - [ ] 12.4. Add a step that fails if the Enhanced Smoke Pack exceeds 60 seconds runtime.

  - [ ] 12.5. Verify workflow by pushing a draft PR—CI must pass and upload artifacts on failure.

  - [ ] 12.6. Push branch and open PR titled "CI: Run Enhanced Smoke Pack in Pull Requests", stacked on top of debugging config PR.

  - [ ] 12.7. Await CI completion on PR.

- [ ] 13. Extend CI workflow to include Full Matrix Pack and CLI tests in regular CI runs (PR)

  - [ ] 13.1. Create branch `e2e_ci-full` **based on `e2e_ci-smoke`**.

  - [ ] 13.2. Update `.github/workflows/e2e.yml` to run additional test suites:
      - Full matrix (`npm run e2e -- --project=matrix`) with 20-min timeout
      - CLI tests (`npm run e2e -- --project=cli`) with 10-min timeout
      - Configure job strategy with 3 parallel workers

  - [ ] 13.3. Ensure failure artifacts (screenshots, videos, logs) are uploaded for any failing job.

  - [ ] 13.4. Add steps that monitor runtime for each test suite:
      - Warn if matrix approaches 20-minute limit
      - Warn if CLI tests approach 10-minute limit

  - [ ] 13.5. Verify locally and push branch; open PR titled "CI: Full test suite integration", stacked on top of the smoke CI PR.

  - [ ] 13.6. Wait for CI to pass on PR.
