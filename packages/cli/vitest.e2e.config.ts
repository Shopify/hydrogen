import {defineConfig} from 'vitest/config';

/**
 * Vitest config for E2E tests that require full git history.
 * Used by .github/workflows/test-upgrade-flow.yml.
 * Not used by the regular `pnpm test` suite (vitest.config.ts).
 */
export default defineConfig({
  test: {
    globalSetup: './vitest.setup.ts',
    include: ['src/**/*-e2e.test.ts'],
    // The full matrix scaffolds and installs dependencies for nine upgrade paths
    // sequentially, which can exceed ten minutes on hosted runners.
    testTimeout: 20 * 60 * 1000,
  },
});
