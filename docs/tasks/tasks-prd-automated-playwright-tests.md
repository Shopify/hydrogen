## Relevant Files

- `playwright.config.ts` – Base Playwright configuration with support for --smoke flag via environment variables.
- `e2e/setup/launch.spec.ts` – System test that verifies dev server launches and displays Hydrogen title.
- `e2e/server.ts` – Helper module for programmatically starting and stopping the dev server.
- `e2e/smoke/` – Directory for fast smoke tests that run against an existing skeleton template.
- `e2e/smoke/home.spec.ts` – Smoke test for home page: hero image, product grid, and console errors.
- `e2e/smoke/cart.spec.ts` – Smoke test for cart functionality: open cart, add product, verify handle.
- `e2e/matrix/` – Directory for full-matrix tests that scaffold permutations of `npm create @shopify/hydrogen`.
- `scripts/run-e2e.js` – Custom E2E test runner that handles --smoke, --headed, and --matrix flags.
- `package.json` – Adds `e2e` npm script with support for `--smoke` flag via custom runner script.
- `.github/workflows/e2e.yml` – GitHub Actions workflow running smoke tests on pull requests only
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
- **PR Stacking**: Use `gh pr create --base <branch>` to stack PRs properly. For example, PR #2 was stacked on `e2e_infra-baseline` rather than `main`.
- **CI Timing**: The full CI pipeline takes approximately 5-6 minutes to complete, with unit tests being the longest-running job.
- **Required Checks**: The Hydrogen repo has multiple required checks including TypeScript, ESLint, Prettier, Unit tests, Recipe validation, and Deploy to Oxygen variations.

#### NPM Scripts Pattern
- **E2E Scripts Added**: 
  - `"e2e": "playwright test"` - runs all E2E tests
  - `"e2e:smoke": "playwright test e2e/smoke"` - runs only smoke tests
- **Note**: The `--smoke` flag mentioned in the PRD wasn't implemented yet as it requires additional Playwright configuration. The `e2e:smoke` script achieves the same goal by specifying the test directory.

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

  - [x] 2.5. Verify by running `npm run e2e -- --smoke` and ensuring the pack completes in <60 s.

  - [x] 2.6. Push branch and open PR #2 titled "E2E: Smoke Test Pack for Skeleton Template". Ensure PR #2 is **stacked on top of PR #1**.
  - [x] 2.7. Wait for CI to finish and pass on PR #2.

- [ ] 3. Add `npm run e2e` script and integrate Smoke Pack with CI workflow (PR #3)

  - [x] 3.1. Create branch `e2e_ci-smoke` **based on `e2e_smoke-pack`**.

  - [x] 3.2. Add `"e2e": "playwright test"` to `package.json` plus `--smoke` flag support.

  - [x] 3.3. Add `.github/workflows/e2e.yml` workflow that runs `npm run e2e -- --smoke` on `pull_request` events only.

  - [x] 3.4. Verify workflow by pushing a draft PR—CI must pass and upload artifacts on failure.

  - [ ] 3.5. Push branch and open PR #3 titled “CI: Run Smoke Pack in Pull Requests”, stacked on top of PR #2.
  - [ ] 3.6. Await CI completion on PR #3.

- [ ] 4. Implement Full Matrix Pack scaffolding and tests for template permutations (one PR per permutation)

  **Permutation dimensions (32 total):**
  1. **Language**: JavaScript | TypeScript
  2. **Styling**: Tailwind v4 | Vanilla Extract | CSS Modules | PostCSS
  3. **Scaffold routes & core functionality**: Yes | No
     - If **Yes** → additional **Markets URL structure**: Subfolders | Subdomains | Top-level domains

  **PR strategy:** Each concrete permutation below becomes its own branch/PR (e.g., `e2e_matrix-js-tailwind-noscaffold`). Follow sub-tasks A-G for every permutation.

  - [ ] 4.1. Write contract tests in `e2e/matrix/contract.spec.ts` that define the expected CLI interface for scaffolding permutations (fails initially).

  - [ ] 4.2. Create scaffolding helper `e2e/matrix/scaffold.ts` that invokes `npm create @shopify/hydrogen` with given flags inside a tmp dir and returns the project path.

  - [ ] 4.3. Ensure `tmp/` directory is listed in `.gitignore` (add if missing).

  - [ ] 4.4. For **each** of the 32 permutations:

        - [ ] A. Determine timestamped project name pattern `tmp/hydrogen-<permutation>-<YYYYMMDDHHMMSS>`.
        - [ ] B. Create failing test `e2e/matrix/<permutation>.spec.ts` exercising root load + cart flow against the new project.
        - [ ] C. Implement permutation flags and timestamped directory logic in `scaffold.ts`. When the helper detects multiple projects matching the same permutation pattern, it must pick **only the most recent** timestamped directory for running tests. Do **not** delete any projects after tests.
        - [ ] D. Verify locally with `npm run e2e -- --matrix=<permutation>`; confirm that:
            1. The helper selects the latest project if duplicates exist.
            2. The chosen project remains in `tmp/` after tests complete.
        - [ ] E. Create branch `e2e_matrix-<permutation>` **based on the branch from the previous permutation**.
        - [ ] F. Push branch and open PR titled “E2E Matrix: <Permutation Description>”, stacked on the previous permutation PR.
        - [ ] G. Wait for CI to complete on this PR and ensure it passes before beginning the next permutation.

  - [ ] 4.4. After all 32 permutation PRs are merged, run full matrix locally (`npm run e2e -- --matrix all`) to ensure runtime ≤20 min.

- [ ] 5. Extend CI workflow to include the Full Matrix Pack in regular CI runs (PR after permutations complete)

  - [ ] 5.1. Create branch `e2e_ci-full-matrix` **based on the last merged permutation branch**.

  - [ ] 5.2. Update `.github/workflows/e2e.yml` to run the full matrix (`npm run e2e -- --matrix all`) on `pull_request` events with a job strategy (3 parallel workers, 20-min timeout).

  - [ ] 5.3. Ensure failure artifacts (screenshots, videos, logs) are uploaded for any failing matrix job.

  - [ ] 5.4. Verify locally and push branch; open PR #10 titled “CI: Full Matrix Pack”, stacked on top of the matrix chain.
  - [ ] 5.5. Wait for CI to pass on PR #10.

- [ ] 6. Write contributor documentation for running and debugging the test suite (PR)

  - [ ] 6.1. Create branch `docs_e2e-guide` **based on `e2e_ci-full-matrix`**.

  - [ ] 6.2. Create `docs/testing/e2e.md` with setup instructions, flags (`--smoke`, `--matrix`, `--headed`), and CI guidance.

  - [ ] 6.3. Add a short section to the project `README.md` linking to the guide.

  - [ ] 6.4. Verify by running `npm run lint` and checking links work in rendered Markdown.

  - [ ] 6.5. Push branch and open PR #11 titled “Docs: E2E Testing Guide”, stacked on top of PR #10.
  - [ ] 6.6. Wait for CI to pass on PR #11.

- [ ] 7. Introduce flake monitoring and performance safeguards (PR)

  - [ ] 7.1. Create branch `e2e_flake-monitoring` **based on `docs_e2e-guide`**.

  - [ ] 7.2. Add Playwright retry analyzer to surface flaky tests in CI summaries.

  - [ ] 7.3. Configure Playwright’s `expect` timeout and `testTimeout` defaults to keep Smoke Pack ≤60 s and Full Matrix ≤20 min.

  - [ ] 7.4. Add a GitHub Action step that fails if the Smoke Pack exceeds 60 s or any test flakes >1 % over the last 30 runs (simple JSON cache).

  - [ ] 7.5. Verify by introducing an artificial delay/flaky test locally, ensuring CI flags the issue, then removing it.

  - [ ] 7.6. Push branch and open PR #12 titled “E2E: Flake & Performance Guards”, stacked on top of PR #11.
  - [ ] 7.7. Wait for CI to finish and pass on PR #12.
