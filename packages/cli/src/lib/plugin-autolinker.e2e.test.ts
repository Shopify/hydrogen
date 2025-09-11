import {describe, it, expect} from 'vitest';
import {execSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

describe('plugin-autolinker e2e', () => {
  it('proves auto-linking makes local CLI execute instead of npm version', async () => {
    // Skip in CI to avoid interfering with other tests
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      console.log('Skipping e2e test in CI environment');
      return;
    }

    const currentDir = dirname(fileURLToPath(import.meta.url));
    const cliPackageRoot = join(currentDir, '..', '..');
    const e2eTestPath = join(cliPackageRoot, 'e2e-test-autolink.cjs');

    // Run the e2e test script - it will exit with code 0 on success, non-zero on failure
    try {
      execSync(`node ${e2eTestPath}`, {
        encoding: 'utf8',
        cwd: cliPackageRoot,
        stdio: 'ignore', // Ignore output to avoid issues with large output
        env: {
          ...process.env,
          // Ensure we're not in test mode which would disable auto-linking
          NODE_ENV: 'development',
        },
      });
      // If we get here, the test passed (exit code 0)
      expect(true).toBe(true);
    } catch (error: any) {
      // The test script exited with non-zero code
      throw new Error(
        `E2E auto-link proof test failed. Run 'node e2e-test-autolink.cjs' for details.`,
      );
    }
  }, 120000); // 2 minute timeout for e2e test
});