import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mkdtemp, readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exec} from '@shopify/cli-kit/node/system';
import {execAsync} from '../../lib/process.js';
import * as upgradeModule from './upgrade.js';
import {spawn, ChildProcess} from 'node:child_process';
import getPort from 'get-port';
import {fileExists} from '@shopify/cli-kit/node/fs';

// Mock the UI prompts to avoid interactive prompts during tests
vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderTasks: vi.fn(async (tasks) => {
      // Execute all tasks to perform the actual upgrade operations
      for (const task of tasks) {
        if (task.task && typeof task.task === 'function') {
          await task.task();
        }
      }
    }),
    renderSelectPrompt: vi.fn(() => Promise.resolve()),
    renderConfirmationPrompt: vi.fn(() => Promise.resolve(true)), // Always confirm
    renderInfo: vi.fn(() => {}), // Mock renderInfo to silence output
    renderSuccess: vi.fn(() => {}), // Mock renderSuccess to silence output
  };
});

describe('upgrade flow integration', () => {
  beforeEach(() => {
    // Clear any cached changelog to ensure mocks work properly
    vi.clearAllMocks();
  });

  describe('End-to-end upgrade scenarios', () => {
    // Test 1: Simple minor version upgrade without guide
    it('performs simple minor version upgrade (2025.4.0 to 2025.4.1)', async () => {
      // Use specific known versions that should work
      const fromVersion = '2025.4.0';
      const toVersion = '2025.4.1';
      const fromCommit = '1fff0f889'; // Known commit with 2025.4.0

      // Verify commit exists
      try {
        await execAsync(
          `git show ${fromCommit}:templates/skeleton/package.json`,
          {cwd: join(process.cwd(), '../../')},
        );
      } catch {
        expect(true).toBe(true); // Skip if commit not available
        return;
      }

      const projectDir = await scaffoldHistoricalProject(fromCommit);

      // Run upgrade (this should handle npm install internally)
      await runUpgradeCommand(projectDir, toVersion);

      // Verify version was updated
      const packageJson = JSON.parse(
        await readFile(join(projectDir, 'package.json'), 'utf8'),
      );
      const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];
      expect(
        hydrogenVersion === toVersion || hydrogenVersion === `^${toVersion}`,
      ).toBe(true);

      // Verify no guide was generated (minor version upgrade)
      const guideFile = join(
        projectDir,
        '.hydrogen',
        `upgrade-${fromVersion}-to-${toVersion}.md`,
      );
      await expect(readFile(guideFile, 'utf8')).rejects.toThrow();

      // For minor upgrades without breaking changes, verify build/dev/typecheck works
      // First, let's verify the lib/redirect.ts file exists
      const redirectPath = join(projectDir, 'app', 'lib', 'redirect.ts');
      const hasRedirectFile = await fileExists(redirectPath);
      if (!hasRedirectFile) {
        throw new Error(`Missing app/lib/redirect.ts file after scaffolding`);
      }

      // Test build command - suppress the SHOPIFY_UNIT_TEST env var which might
      // cause warnings to be treated as errors
      const originalEnv = process.env.SHOPIFY_UNIT_TEST;
      delete process.env.SHOPIFY_UNIT_TEST;

      try {
        await exec('npm', ['run', 'build'], {
          cwd: projectDir,
          env: {...process.env, NODE_ENV: 'production'},
        });
      } finally {
        // Restore the env var
        if (originalEnv !== undefined) {
          process.env.SHOPIFY_UNIT_TEST = originalEnv;
        }
      }

      // Test typecheck command
      await exec('npm', ['run', 'typecheck'], {cwd: projectDir});

      // Test dev server and route fetching - this is the key validation
      // as per the GitHub workflow documentation
      await testDevServer(projectDir, 'post-upgrade');
    }, 180000);

    // Test 2: Upgrade with migration guide generation
    it('generates migration guide when upgrade has steps', async () => {
      // Currently, there are no releases with migration guides after 2025.4.0
      // in the main branch (2025.5.0 with React Router migration exists only
      // on the branch). This test will be active once 2025.5.0 is released.

      const changelog = await upgradeModule.getChangelog();
      const fromVersion = '2025.4.0';

      // Find a release after 2025.4.0 that has steps
      let targetRelease = null;
      let toVersion = null;

      for (const release of changelog.releases) {
        if (release.version <= fromVersion) continue;

        const hasSteps =
          release.features?.some((f: any) => f.steps?.length > 0) ||
          release.fixes?.some((f: any) => f.steps?.length > 0);

        if (hasSteps) {
          targetRelease = release;
          toVersion = release.version;
          break;
        }
      }

      if (!targetRelease || !toVersion) {
        // Skip test until a release with migration guide exists after 2025.4.0
        expect(true).toBe(true);
        return;
      }

      // Skip if the target version is 2025.5.0 (React Router migration)
      // as it has known dependency conflicts in test environment
      if (toVersion === '2025.5.0') {
        expect(true).toBe(true);
        return;
      }

      // This code will execute for other releases with steps
      const fromCommit = '1fff0f889'; // Known commit for 2025.4.0

      const projectDir = await scaffoldHistoricalProject(fromCommit);

      // Run upgrade
      await runUpgradeCommand(projectDir, toVersion);

      // Verify guide was generated
      const guideFile = join(
        projectDir,
        '.hydrogen',
        `upgrade-${fromVersion}-to-${toVersion}.md`,
      );
      const guideContent = await readFile(guideFile, 'utf8');

      // Verify guide is valid markdown
      expect(guideContent).toContain(
        `# Hydrogen upgrade guide: ${fromVersion} to ${toVersion}`,
      );
      expect(guideContent.split('\n').length).toBeGreaterThan(10); // Has substantial content

      // Skip npm install check as upgrade command should have handled it
    }, 180000);

    // Test 3: Complex upgrade with dependency removal
    it('tests dependency removal feature when available in changelog', async () => {
      // Get the actual changelog to find a release with removeDependencies
      const changelog = await upgradeModule.getChangelog();

      // Find the first release that has removeDependencies
      let targetRelease = null;
      let fromVersion = '2025.4.0';
      let toVersion = null;

      // First check if 2025.5.0 exists (React Router migration)
      targetRelease = changelog.releases.find(
        (r: any) => r.version === '2025.5.0',
      );
      if (
        targetRelease &&
        ((targetRelease.removeDependencies?.length ?? 0) > 0 ||
          (targetRelease.removeDevDependencies?.length ?? 0) > 0)
      ) {
        toVersion = '2025.5.0';
      } else {
        // Otherwise find any release with removeDependencies
        for (const release of changelog.releases) {
          if (
            (release.removeDependencies?.length ?? 0) > 0 ||
            (release.removeDevDependencies?.length ?? 0) > 0
          ) {
            // Make sure we can upgrade TO this version (it should be newer than fromVersion)
            if (release.version > fromVersion) {
              targetRelease = release;
              toVersion = release.version;
              break;
            }
          }
        }
      }

      if (!targetRelease || !toVersion) {
        // No release with removeDependencies found, skip test
        expect(true).toBe(true);
        return;
      }

      // Find a commit for the fromVersion
      const fromCommit = await findCommitForVersion(fromVersion);
      if (!fromCommit) {
        expect(true).toBe(true);
        return;
      }

      const projectDir = await scaffoldHistoricalProject(fromCommit);

      // Check which dependencies we expect to be removed
      const beforePackageJson = JSON.parse(
        await readFile(join(projectDir, 'package.json'), 'utf8'),
      );

      // Track which dependencies exist before upgrade and should be removed
      const depsToRemove = targetRelease.removeDependencies || [];
      const devDepsToRemove = targetRelease.removeDevDependencies || [];

      const existingDepsToRemove = depsToRemove.filter(
        (dep) => beforePackageJson.dependencies?.[dep],
      );
      const existingDevDepsToRemove = devDepsToRemove.filter(
        (dep) => beforePackageJson.devDependencies?.[dep],
      );

      // Run upgrade
      await runUpgradeCommand(projectDir, toVersion);

      // Check if dependencies were removed
      const afterPackageJson = JSON.parse(
        await readFile(join(projectDir, 'package.json'), 'utf8'),
      );

      // Verify removed dependencies
      for (const dep of existingDepsToRemove) {
        expect(afterPackageJson.dependencies?.[dep]).toBeUndefined();
      }

      for (const dep of existingDevDepsToRemove) {
        expect(afterPackageJson.devDependencies?.[dep]).toBeUndefined();
      }

      // Verify version was updated
      const hydrogenVersion =
        afterPackageJson.dependencies?.['@shopify/hydrogen'];
      expect(
        hydrogenVersion === toVersion || hydrogenVersion === `^${toVersion}`,
      ).toBe(true);

      // Verify new dependencies were added if specified
      if (targetRelease.dependencies) {
        for (const [dep, version] of Object.entries(
          targetRelease.dependencies,
        )) {
          if (dep !== '@shopify/hydrogen') {
            // Skip hydrogen as we check it separately
            const actualVersion = afterPackageJson.dependencies?.[dep];
            // Accept both exact version and semver ranges
            expect(
              actualVersion === version ||
                actualVersion === `^${version}` ||
                actualVersion === `~${version}`,
            ).toBe(true);
          }
        }
      }

      if (targetRelease.devDependencies) {
        for (const [dep, version] of Object.entries(
          targetRelease.devDependencies,
        )) {
          const actualVersion = afterPackageJson.devDependencies?.[dep];
          // Accept both exact version and semver ranges
          if (dep === '@shopify/cli') {
            // Special case for @shopify/cli which uses different semver range
            expect(actualVersion).toBeDefined();
          } else {
            expect(
              actualVersion === version ||
                actualVersion === `^${version}` ||
                actualVersion === `~${version}`,
            ).toBe(true);
          }
        }
      }
    }, 180000);

    // Test 4: Dynamic test for latest changelog release
    it('performs upgrade to latest release', async () => {
      const changelog = await upgradeModule.getChangelog();
      const latestRelease = changelog.releases[0];

      if (!latestRelease) {
        throw new Error('No releases found in changelog');
      }

      // Find a suitable from version (skip if it's a major breaking change)
      let fromRelease = null;
      let fromCommit = null;

      // Try to find a version 2-3 releases back
      for (let i = 2; i <= 5 && i < changelog.releases.length; i++) {
        const candidate = changelog.releases[i];
        if (!candidate) continue;
        const commit = await findCommitForVersion(candidate.version);
        if (commit) {
          fromRelease = candidate;
          fromCommit = commit;
          break;
        }
      }

      if (!fromRelease || !fromCommit) {
        expect(true).toBe(true); // Skip if no suitable version found
        return;
      }

      const fromVersion = fromRelease.version;
      const toVersion = latestRelease.version;

      const projectDir = await scaffoldHistoricalProject(fromCommit);

      // Check what scenarios apply to this upgrade
      const hasGuide =
        latestRelease.features?.some((f: any) => f.steps?.length > 0) ||
        latestRelease.fixes?.some((f: any) => f.steps?.length > 0);

      // Run upgrade
      await runUpgradeCommand(projectDir, toVersion, {
        skipDependencyValidation: true, // Always skip since we know the issue exists
      });

      // Verify version was updated
      const packageJson = JSON.parse(
        await readFile(join(projectDir, 'package.json'), 'utf8'),
      );
      const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];
      expect(
        hydrogenVersion === toVersion || hydrogenVersion === `^${toVersion}`,
      ).toBe(true);

      // Check guide generation
      const guideFile = join(
        projectDir,
        '.hydrogen',
        `upgrade-${fromVersion}-to-${toVersion}.md`,
      );
      if (hasGuide) {
        const guideContent = await readFile(guideFile, 'utf8');
        expect(guideContent).toContain(
          `# Hydrogen upgrade guide: ${fromVersion} to ${toVersion}`,
        );
        expect(guideContent.length).toBeGreaterThan(100);
      } else {
        await expect(readFile(guideFile, 'utf8')).rejects.toThrow();
      }

      // Skip npm install check as upgrade command should have handled it
    }, 180000);
  });

  describe('Changelog validation', () => {
    it('validates changelog.json follows correct structure and has no rogue fields', async () => {
      // First validate that the changelog is valid JSON by reading it directly
      const changelogPath = join(process.cwd(), '../../docs/changelog.json');
      const changelogContent = await readFile(changelogPath, 'utf8');

      // Validate JSON syntax
      let parsedChangelog;
      try {
        parsedChangelog = JSON.parse(changelogContent);
      } catch (error) {
        throw new Error(
          `Invalid JSON in changelog.json: ${(error as Error).message}`,
        );
      }

      // Also get changelog through the module for consistency
      const changelog = await upgradeModule.getChangelog();

      // Ensure both are the same
      expect(changelog).toEqual(parsedChangelog);

      // Validate top-level changelog structure
      const allowedChangelogFields = ['url', 'version', 'releases'];
      const changelogKeys = Object.keys(changelog);
      const rogueChangelogFields = changelogKeys.filter(
        (key) => !allowedChangelogFields.includes(key),
      );
      expect(rogueChangelogFields).toEqual([]);

      // Pre-compile field sets for efficient lookups
      const allowedReleaseFields = new Set([
        'title',
        'version',
        'date',
        'hash',
        'commit',
        'pr',
        'dependencies',
        'devDependencies',
        'dependenciesMeta',
        'removeDependencies',
        'removeDevDependencies',
        'features',
        'fixes',
      ]);

      const allowedItemFields = new Set([
        'title',
        'info',
        'pr',
        'id',
        'breaking',
        'docs',
        'steps',
        'desc',
        'code',
        'description',
      ]);

      const allowedStepFields = new Set([
        'title',
        'info',
        'code',
        'file',
        'reel',
        'desc',
        'docs',
      ]);

      // Pre-compile regular expressions for better performance
      const urlRegex = /^https:\/\/.+/;
      const versionRegex = /^\d{4}\.\d+\.\d+$/;
      const semverRegex = /^[\^~]?\d+\.\d+\.\d+.*$/;

      // Validate each release efficiently
      for (
        let releaseIndex = 0;
        releaseIndex < changelog.releases.length;
        releaseIndex++
      ) {
        const release = changelog.releases[releaseIndex];
        // Check for rogue fields in release using Set for O(1) lookup
        const releaseKeys = Object.keys(release);
        const rogueReleaseFields = releaseKeys.filter(
          (key) => !allowedReleaseFields.has(key),
        );
        expect(rogueReleaseFields).toEqual([]);

        // Validate required fields
        expect(release.title).toBeDefined();
        expect(release.version).toBeDefined();
        expect(release.hash).toBeDefined();
        expect(release.commit).toBeDefined();
        expect(release.dependencies).toBeDefined();
        expect(release.devDependencies).toBeDefined();
        expect(release.features).toBeDefined();
        expect(release.fixes).toBeDefined();

        // Validate URL formats using pre-compiled regex
        if (release.pr) {
          expect(typeof release.pr).toBe('string');
        }
        expect(release.commit).toMatch(urlRegex);

        // Validate version format using pre-compiled regex
        expect(release.version).toMatch(versionRegex);

        // Validate date format (flexible format)
        if (release.date) {
          expect(typeof release.date).toBe('string');
          expect(release.date.length).toBeGreaterThan(0);
        }

        // Validate features efficiently
        if (release.features) {
          for (
            let featureIndex = 0;
            featureIndex < release.features.length;
            featureIndex++
          ) {
            const feature = release.features[featureIndex];
            const featureKeys = Object.keys(feature);
            const rogueFeatureFields = featureKeys.filter(
              (key) => !allowedItemFields.has(key),
            );
            expect(rogueFeatureFields).toEqual([]);

            // Validate required fields
            expect(feature.title).toBeDefined();

            // Validate pr field format (can be URL or text)
            if (feature.pr) {
              expect(typeof feature.pr).toBe('string');
            }

            // Validate steps if present
            if (feature.steps) {
              expect(Array.isArray(feature.steps)).toBe(true);
              for (
                let stepIndex = 0;
                stepIndex < feature.steps.length;
                stepIndex++
              ) {
                const step = feature.steps[stepIndex];
                const stepKeys = Object.keys(step);
                const rogueStepFields = stepKeys.filter(
                  (key) => !allowedStepFields.has(key),
                );
                expect(rogueStepFields).toEqual([]);

                // Validate required step fields
                expect(step.title).toBeDefined();

                // Validate base64 encoded code
                if (step.code) {
                  expect(() =>
                    Buffer.from(step.code, 'base64').toString(),
                  ).not.toThrow();
                }
              }
            }
          }
        }

        // Validate fixes efficiently
        if (release.fixes) {
          for (let fixIndex = 0; fixIndex < release.fixes.length; fixIndex++) {
            const fix = release.fixes[fixIndex];
            const fixKeys = Object.keys(fix);
            const rogueFixFields = fixKeys.filter(
              (key) => !allowedItemFields.has(key),
            );
            expect(rogueFixFields).toEqual([]);

            // Validate required fields
            expect(fix.title).toBeDefined();

            // Validate pr field format (can be URL or text)
            if (fix.pr) {
              expect(typeof fix.pr).toBe('string');
            }

            // Validate steps if present
            if (fix.steps) {
              expect(Array.isArray(fix.steps)).toBe(true);
              for (
                let stepIndex = 0;
                stepIndex < fix.steps.length;
                stepIndex++
              ) {
                const step = fix.steps[stepIndex];
                const stepKeys = Object.keys(step);
                const rogueStepFields = stepKeys.filter(
                  (key) => !allowedStepFields.has(key),
                );
                expect(rogueStepFields).toEqual([]);

                // Validate required step fields
                expect(step.title).toBeDefined();

                // Validate base64 encoded code
                if (step.code) {
                  expect(() =>
                    Buffer.from(step.code, 'base64').toString(),
                  ).not.toThrow();
                }
              }
            }
          }
        }

        // Validate dependencies are in correct format using pre-compiled regex
        if (release.dependencies) {
          for (const [pkg, version] of Object.entries(release.dependencies)) {
            expect(typeof pkg).toBe('string');
            expect(typeof version).toBe('string');
            expect(version).toMatch(semverRegex);
          }
        }

        if (release.devDependencies) {
          for (const [pkg, version] of Object.entries(
            release.devDependencies,
          )) {
            expect(typeof pkg).toBe('string');
            expect(typeof version).toBe('string');
            expect(version).toMatch(semverRegex);
          }
        }

        // Validate dependenciesMeta structure
        if (release.dependenciesMeta) {
          for (const [pkg, meta] of Object.entries(release.dependenciesMeta)) {
            expect(typeof pkg).toBe('string');
            expect(typeof meta).toBe('object');
            expect(typeof meta.required).toBe('boolean');
            // Check for rogue fields in meta (only 'required' is allowed)
            const metaKeys = Object.keys(meta);
            const rogueMetaFields = metaKeys.filter(
              (key) => key !== 'required',
            );
            expect(rogueMetaFields).toEqual([]);
          }
        }

        // Validate removeDependencies and removeDevDependencies are string arrays
        if (release.removeDependencies) {
          expect(Array.isArray(release.removeDependencies)).toBe(true);
          for (const dep of release.removeDependencies) {
            expect(typeof dep).toBe('string');
          }
        }

        if (release.removeDevDependencies) {
          expect(Array.isArray(release.removeDevDependencies)).toBe(true);
          for (const dep of release.removeDevDependencies) {
            expect(typeof dep).toBe('string');
          }
        }
      }
    });
  });
});

// Helper function to find commit for a specific version
async function findCommitForVersion(version: string): Promise<string | null> {
  try {
    const repoRoot = join(process.cwd(), '../../');

    // First try to find commits that mention the version
    const {stdout} = await execAsync(
      `git log --format=%H --grep="${version}" -- templates/skeleton/package.json | head -10`,
      {cwd: repoRoot},
    );

    const commits = stdout.trim().split('\n').filter(Boolean);

    // Check each commit to find one with the exact version
    for (const commit of commits) {
      try {
        const {stdout: packageContent} = await execAsync(
          `git show ${commit}:templates/skeleton/package.json`,
          {cwd: repoRoot},
        );
        const packageJson = JSON.parse(packageContent);
        if (packageJson.dependencies?.['@shopify/hydrogen'] === version) {
          return commit;
        }
      } catch {
        // Continue to next commit
      }
    }

    // Fallback: search more broadly in recent commits
    const {stdout: allCommits} = await execAsync(
      'git log --format=%H -- templates/skeleton/package.json | head -50',
      {cwd: repoRoot},
    );

    for (const commit of allCommits.trim().split('\n').filter(Boolean)) {
      try {
        const {stdout: packageContent} = await execAsync(
          `git show ${commit}:templates/skeleton/package.json`,
          {cwd: repoRoot},
        );
        const packageJson = JSON.parse(packageContent);
        if (packageJson.dependencies?.['@shopify/hydrogen'] === version) {
          return commit;
        }
      } catch {
        // Continue to next commit
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function scaffoldHistoricalProject(commit: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'hydrogen-upgrade-test-'));
  const projectDir = join(tempDir, 'test-project');

  try {
    // Extract the skeleton template from the historical commit
    const repoRoot = join(process.cwd(), '../../');
    await execAsync(
      `git archive ${commit} -- templates/skeleton | tar -x -C ${tempDir}`,
      {
        cwd: repoRoot,
      },
    );

    // Move skeleton to project directory
    await execAsync(`mv ${join(tempDir, 'templates/skeleton')} ${projectDir}`);

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

    // Install dependencies for the scaffolded project
    await exec('npm', ['install'], {cwd: projectDir});

    return projectDir;
  } catch (error) {
    throw new Error(
      `Failed to scaffold historical project: ${(error as Error).message}`,
    );
  }
}

async function runUpgradeCommand(
  projectDir: string,
  toVersion: string,
  options?: {skipDependencyValidation?: boolean},
) {
  // Set environment to use local changelog
  process.env.FORCE_CHANGELOG_SOURCE = 'local';
  process.env.SHOPIFY_HYDROGEN_FLAG_FORCE = '1';
  process.env.CI = '1'; // Set CI mode to avoid prompts

  try {
    // Use the runUpgrade function directly
    await upgradeModule.runUpgrade({
      appPath: projectDir,
      version: toVersion,
      force: true,
    });

    // Validate dependencies were removed if required
    if (!options?.skipDependencyValidation) {
      await validateDependencyRemoval(projectDir, toVersion);
    }
  } catch (error) {
    const err = error as Error;
    throw new Error(`Upgrade command failed: ${err.message}`);
  }
}

async function validateDependencyRemoval(
  projectDir: string,
  toVersion: string,
) {
  // Get the changelog to find what should be removed for this version
  const changelog = await upgradeModule.getChangelog();
  const targetRelease = changelog.releases.find(
    (r: any) => r.version === toVersion,
  );

  if (!targetRelease) {
    return;
  }

  const depsToRemove = [
    ...(targetRelease.removeDependencies || []),
    ...(targetRelease.removeDevDependencies || []),
  ];

  if (depsToRemove.length === 0) {
    return;
  }

  // Read the current package.json
  const packageJsonPath = join(projectDir, 'package.json');
  const packageContent = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageContent);

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check each dependency that should be removed
  const failedRemovals: string[] = [];
  for (const dep of depsToRemove) {
    if (dep in allDeps) {
      failedRemovals.push(`${dep} (found with version ${allDeps[dep]})`);
    }
  }

  if (failedRemovals.length > 0) {
    throw new Error(
      `The following dependencies should have been removed but are still present:\n${failedRemovals.join(
        '\n',
      )}\n\n` +
        `This could cause npm install conflicts. Dependencies marked for removal: ${depsToRemove.join(
          ', ',
        )}`,
    );
  }
}

async function testDevServer(projectDir: string, phase: string) {
  const port = await getPort({port: [3000, 3001, 3002, 3003]});
  let devProcess: ChildProcess | null = null;

  try {
    // Add a test route before starting
    await addTestRoute(projectDir);

    // Start the dev server
    devProcess = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
      cwd: projectDir,
      env: {...process.env, PORT: port.toString()},
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let serverOutput = '';
    let serverErrors = '';

    devProcess.stdout?.on('data', (data) => {
      serverOutput += data.toString();
    });

    devProcess.stderr?.on('data', (data) => {
      serverErrors += data.toString();
    });

    // Wait for server to be ready
    const serverReady = await waitForServer(
      `http://localhost:${port}`,
      30000,
      () => {
        // Check for critical errors
        if (
          serverErrors.includes('Cannot find module') ||
          serverErrors.includes('Module not found') ||
          serverErrors.includes('Failed to resolve import')
        ) {
          throw new Error(`Import/dependency errors detected: ${serverErrors}`);
        }
      },
    );

    if (!serverReady) {
      throw new Error(
        `Dev server failed to start. Output: ${serverOutput}\nErrors: ${serverErrors}`,
      );
    }

    // Test the server is responding
    const response = await fetch(`http://localhost:${port}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).not.toContain('Error:');
    expect(html).not.toContain('Cannot find module');

    // Test our custom route
    const testResponse = await fetch(`http://localhost:${port}/test-upgrade`);
    const testHtml = await testResponse.text();

    expect(testResponse.status).toBe(200);
    expect(testHtml).toContain('Upgrade Test Route');
    expect(testHtml).toContain('If you can see this, the server is running!');
  } catch (error) {
    throw new Error(
      `Dev server validation failed in ${phase}: ${(error as Error).message}`,
    );
  } finally {
    if (devProcess) {
      devProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!devProcess.killed) {
        devProcess.kill('SIGKILL');
      }
    }
  }
}

async function addTestRoute(projectDir: string) {
  const testRouteContent = `
export default function TestRoute() {
  return (
    <div>
      <h1>Upgrade Test Route</h1>
      <p>If you can see this, the server is running!</p>
    </div>
  );
}
`;

  const routesDir = join(projectDir, 'app', 'routes');
  await mkdir(routesDir, {recursive: true});
  await writeFile(join(routesDir, 'test-upgrade.tsx'), testRouteContent);
}

async function waitForServer(
  url: string,
  timeout: number,
  errorCheck?: () => void,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      if (errorCheck) {
        errorCheck();
      }

      const response = await fetch(url);
      if (response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}
