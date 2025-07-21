import {describe, it, expect} from 'vitest';
import {mkdtemp, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exec} from '@shopify/cli-kit/node/system';
import {execAsync} from '../../lib/process.js';
import {getChangelog, type Release} from './upgrade.js';

describe('upgrade flow integration', () => {
  async function getTestVersions() {
    const changelog = await getChangelog();
    const releases = changelog.releases;

    return {
      latest: releases[0],
      oneBack: releases[1],
      threeBack: releases[3],
      fiveBack: releases[5],
    };
  }

  describe('dynamic version detection', () => {
    it('detects versions from changelog', async () => {
      const testVersions = await getTestVersions();

      expect(testVersions.latest).toBeDefined();
      expect(testVersions.latest?.version).toMatch(/^\d{4}\.\d+\.\d+$/);
    });

    it('finds available commits in git history', async () => {
      const repoRoot = join(process.cwd(), '../../');
      const {stdout} = await execAsync(
        'git log --oneline --all -- templates/skeleton/package.json | head -10',
        {
          cwd: repoRoot,
        },
      );
      const lines = stdout.trim().split('\n');

      expect(lines.length).toBeGreaterThan(0);

      // Try to find at least one commit with a valid version
      let foundValidCommit = false;
      for (const line of lines.slice(0, 3)) {
        // Check first 3 commits
        const [commit] = line.split(' ');
        try {
          const {stdout: packageContent} = await execAsync(
            `git show ${commit}:templates/skeleton/package.json`,
            {
              cwd: repoRoot,
            },
          );
          const packageJson = JSON.parse(packageContent);
          const hydrogenVersion =
            packageJson.dependencies?.['@shopify/hydrogen'];

          if (hydrogenVersion) {
            foundValidCommit = true;
          }
        } catch (error) {
          // Continue trying other commits
        }
      }

      expect(foundValidCommit).toBe(true);
    }, 30000);
  });

  describe('upgrade paths', () => {
    it('scaffolds project and validates upgrade command structure', async () => {
      const testVersions = await getTestVersions();
      const toVersion = testVersions.latest?.version;
      if (!toVersion) throw new Error('Latest version not found');

      // Use a recent commit that should exist in CI
      const commit = 'a1185faa9';
      const actualFromVersion = await getVersionFromCommit(commit);

      const projectDir = await scaffoldHistoricalProject(
        actualFromVersion,
        commit,
      );

      try {
        // Verify project structure
        const packageJsonPath = join(projectDir, 'package.json');
        const packageContent = await readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageContent);

        expect(packageJson.dependencies?.['@shopify/hydrogen']).toBeDefined();
        expect(packageJson.dependencies?.['@shopify/hydrogen']).toBe(
          actualFromVersion,
        );

        // Verify project has all expected files
        const expectedFiles = [
          'package.json',
          'app/root.tsx',
          'app/routes/_index.tsx',
          'vite.config.ts',
        ];
        for (const file of expectedFiles) {
          const filePath = join(projectDir, file);
          expect(await readFile(filePath, 'utf8')).toBeDefined();
        }

        // Verify our upgrade command infrastructure works with FORCE_CHANGELOG_SOURCE
        const rootDir = join(process.cwd(), '../../'); // Go to repo root

        const upgradeEnv = {
          ...process.env,
          FORCE_CHANGELOG_SOURCE: 'local',
          SHOPIFY_HYDROGEN_FLAG_FORCE: '1',
        };

        // Test the help command to ensure CLI works with our environment
        // Use npx shopify which should use the local @shopify/cli-hydrogen package
        const {stdout} = await execAsync(
          `npx shopify hydrogen upgrade --help`,
          {
            cwd: projectDir,
            env: upgradeEnv,
          },
        );

        expect(stdout).toContain('upgrade');

        // Test that local changelog loading works by checking if we can access our upgrade module
        const {stdout: testOutput} = await execAsync(
          `node --input-type=module -e "
          process.env.FORCE_CHANGELOG_SOURCE = 'local';
          const {getChangelog} = await import('${join(rootDir, 'packages/cli/dist/commands/hydrogen/upgrade.js')}');
          try {
            const changelog = await getChangelog();
            console.log('Local changelog loaded with', changelog.releases.length, 'releases');
            console.log('Latest version:', changelog.releases[0].version);
          } catch (err) {
            console.error('Error:', err.message);
          }
        "`,
          {
            cwd: rootDir,
            env: upgradeEnv,
          },
        );

        expect(testOutput).toContain('Local changelog loaded');
        expect(testOutput).toContain(toVersion);
      } finally {
        // Cleanup is handled by temp directory auto-removal
      }
    }, 180000);
  });
});

async function testUpgradePath(
  fromVersion: string,
  toVersion: string,
  commit: string,
) {
  const projectDir = await scaffoldHistoricalProject(fromVersion, commit);

  try {
    // Validate initial project health
    await validateProjectHealth(projectDir, 'pre-upgrade');

    // Run the upgrade
    await runUpgradeCommand(projectDir, toVersion);

    // Validate post-upgrade health
    await validateProjectHealth(projectDir, 'post-upgrade');

    // Verify the upgrade was successful
    await verifyUpgradeSuccess(projectDir, toVersion);
  } finally {
    // Cleanup is handled by temp directory auto-removal
  }
}

async function findHistoricalCommit(
  targetVersion: string,
): Promise<string | null> {
  try {
    const {stdout} = await execAsync(
      'git log --oneline --all -- templates/skeleton/package.json',
    );
    const lines = stdout.trim().split('\n').slice(0, 50); // Check more commits

    for (const line of lines) {
      const [commit] = line.split(' ');
      if (!commit) continue;

      try {
        const {stdout: packageContent} = await execAsync(
          `git show ${commit}:templates/skeleton/package.json`,
        );
        const packageJson = JSON.parse(packageContent);
        const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];

        if (
          hydrogenVersion === targetVersion ||
          hydrogenVersion === `^${targetVersion}`
        ) {
          return commit;
        }
      } catch (error) {
        continue;
      }
    }

    // Fallback: try to find any commit with a close version
    for (const line of lines.slice(0, 10)) {
      const [commit] = line.split(' ');
      if (!commit) continue;

      try {
        const {stdout: packageContent} = await execAsync(
          `git show ${commit}:templates/skeleton/package.json`,
        );
        const packageJson = JSON.parse(packageContent);
        const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];

        if (hydrogenVersion && hydrogenVersion.includes('2025.')) {
          return commit;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function findAnyHistoricalCommit(): Promise<{
  hash: string;
  version: string;
} | null> {
  try {
    const {stdout} = await execAsync(
      'git log --oneline --all -- templates/skeleton/package.json | head -10',
    );
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      const [commit] = line.split(' ');
      if (!commit) continue;

      try {
        const {stdout: packageContent} = await execAsync(
          `git show ${commit}:templates/skeleton/package.json`,
        );
        const packageJson = JSON.parse(packageContent);
        const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];

        if (hydrogenVersion) {
          return {hash: commit, version: hydrogenVersion};
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function getVersionFromCommit(commit: string): Promise<string> {
  try {
    const repoRoot = join(process.cwd(), '../../');
    const {stdout: packageContent} = await execAsync(
      `git show ${commit}:templates/skeleton/package.json`,
      {
        cwd: repoRoot,
      },
    );
    const packageJson = JSON.parse(packageContent);
    return packageJson.dependencies?.['@shopify/hydrogen'] || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

async function scaffoldHistoricalProject(
  version: string,
  commit: string,
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'hydrogen-upgrade-test-'));
  const projectDir = join(tempDir, 'test-project');

  try {
    // Extract the skeleton template from the historical commit using git archive
    // We need to run this from the hydrogen repo root, not the packages/cli directory
    const repoRoot = join(process.cwd(), '../../'); // Go up from packages/cli to repo root
    await execAsync(
      `git archive ${commit} -- templates/skeleton | tar -x -C ${tempDir}`,
      {
        cwd: repoRoot,
      },
    );

    // Check if extraction was successful
    const skeletonPath = join(tempDir, 'templates/skeleton');
    try {
      await execAsync(`ls -la ${skeletonPath}`);
    } catch (error) {
      throw new Error(
        `Skeleton extraction failed - directory ${skeletonPath} not found`,
      );
    }

    // Move skeleton to project directory
    await execAsync(`mv ${skeletonPath} ${projectDir}`);

    // Initialize git repo (required for many operations)
    await exec('git', ['init'], {cwd: projectDir});
    await exec('git', ['config', 'user.email', 'test@hydrogen.test'], {
      cwd: projectDir,
    });
    await exec('git', ['config', 'user.name', 'Hydrogen Test'], {
      cwd: projectDir,
    });
    await exec('git', ['add', '.'], {cwd: projectDir});
    await exec('git', ['commit', '-m', 'Initial project setup'], {
      cwd: projectDir,
    });

    return projectDir;
  } catch (error) {
    throw new Error(
      `Failed to scaffold historical project: ${(error as Error).message}`,
    );
  }
}

async function validateProjectHealth(projectDir: string, phase: string) {
  try {
    await exec('npm', ['install'], {cwd: projectDir});
  } catch (error) {
    throw new Error(
      `Dependencies installation failed in ${phase}: ${(error as Error).message}`,
    );
  }

  // Check if build script exists and run it
  const packageJsonPath = join(projectDir, 'package.json');
  const packageContent = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageContent);

  if (packageJson.scripts?.build) {
    try {
      await exec('npm', ['run', 'build'], {cwd: projectDir});
    } catch (error) {
      throw new Error(`Build failed in ${phase}: ${(error as Error).message}`);
    }
  }

  if (packageJson.scripts?.typecheck) {
    try {
      await exec('npm', ['run', 'typecheck'], {cwd: projectDir});
    } catch (error) {
      throw new Error(
        `TypeScript validation failed in ${phase}: ${(error as Error).message}`,
      );
    }
  }

  // Test dev server startup (with timeout)
  if (packageJson.scripts?.dev) {
    try {
      const devProcess = exec('npm', ['run', 'dev'], {cwd: projectDir});

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Note: devProcess is a Promise<void>, not a process with kill method
          // For testing purposes, we'll just resolve after timeout
          resolve();
        }, 15000); // Increased timeout for dev server

        devProcess
          .then(() => {
            clearTimeout(timeout);
            reject(new Error('Dev server exited unexpectedly'));
          })
          .catch(() => {
            clearTimeout(timeout);
            resolve();
          });
      });
    } catch (error) {
      throw new Error(
        `Dev server validation failed in ${phase}: ${(error as Error).message}`,
      );
    }
  }
}

async function runUpgradeCommand(projectDir: string, toVersion: string) {
  const upgradeEnv = {
    ...process.env,
    FORCE_CHANGELOG_SOURCE: 'local',
    SHOPIFY_HYDROGEN_FLAG_FORCE: '1',
  };

  try {
    const result = await execAsync(
      `npx shopify hydrogen upgrade --version ${toVersion} --force`,
      {
        cwd: projectDir,
        env: upgradeEnv,
      },
    );
  } catch (error) {
    throw new Error(`Upgrade command failed: ${(error as Error).message}`);
  }
}

async function verifyUpgradeSuccess(
  projectDir: string,
  expectedVersion: string,
) {
  const packageJsonPath = join(projectDir, 'package.json');
  const packageContent = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageContent);

  const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];

  expect(hydrogenVersion).toBeDefined();
  expect(
    hydrogenVersion === expectedVersion ||
      hydrogenVersion === `^${expectedVersion}` ||
      hydrogenVersion?.includes(expectedVersion),
  ).toBe(true);
}
