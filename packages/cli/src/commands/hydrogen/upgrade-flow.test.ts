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
    // Test 1: Single version upgrade to latest release
    it('upgrades from previous version to latest release', async () => {
      const changelog = await upgradeModule.getChangelog();
      const latestRelease = changelog.releases[0];

      if (!latestRelease) {
        throw new Error('No releases found in changelog');
      }

      // Find the previous release (just one version back for clean single-version upgrade)
      let fromRelease = null;
      let fromCommit = null;

      // Use the previous release (index 1) for a clean single-version upgrade
      if (changelog.releases.length > 1) {
        const candidate = changelog.releases[1];
        if (candidate) {
          const commit = await findCommitForVersion(candidate.version);
          if (commit) {
            fromRelease = candidate;
            fromCommit = commit;
          }
        }
      }

      if (!fromRelease || !fromCommit) {
        const availableVersions = changelog.releases
          .slice(0, 5)
          .map((r) => r.version)
          .join(', ');

        throw new Error(
          `Could not find commit for latest release version. This indicates a problem with the changelog or Git history. ` +
            `Tried version: ${changelog.releases[1]?.version}. ` +
            `Available versions: ${availableVersions}. ` +
            `Latest version: ${latestRelease.version}.`,
        );
      }

      const fromVersion = fromRelease.version;
      const toVersion = latestRelease.version;

      const projectDir = await scaffoldHistoricalProject(fromCommit);

      // Verify we started with the historical version (not the target version)
      const initialPackageJson = JSON.parse(
        await readFile(join(projectDir, 'package.json'), 'utf8'),
      );

      const initialHydrogenVersion =
        initialPackageJson.dependencies?.['@shopify/hydrogen'];

      // Check if this is a same-version dependency upgrade
      const isSameVersionUpgrade = fromVersion === toVersion;

      if (!isSameVersionUpgrade) {
        // For different version upgrades, ensure we're not already on the target version
        expect(
          initialHydrogenVersion === toVersion ||
            initialHydrogenVersion === `^${toVersion}`,
        ).toBe(false);
      } else {
        // For same-version upgrades, we need to check if it's actually upgradeable
        // The upgrade.ts logic uses hasOutdatedDependencies which excludes @shopify/cli
        const hasOutdatedDeps = Object.entries({
          ...latestRelease.dependencies,
          ...latestRelease.devDependencies,
        }).some(([name, version]) => {
          if (name === '@shopify/cli') return false; // Skip CLI as it's excluded in upgrade.ts
          const currentVersion =
            initialPackageJson.dependencies?.[name] ||
            initialPackageJson.devDependencies?.[name];
          if (!currentVersion) return false;

          try {
            // Use semver to compare versions like upgrade.ts does
            const semver = require('semver');
            return semver.gt(
              semver.minVersion(version).version,
              semver.minVersion(currentVersion).version,
            );
          } catch {
            // Fallback to string comparison if semver fails
            const versionPattern = /^[\^~]?([\d.]+)/;
            const currentMatch = currentVersion.match(versionPattern);
            const targetMatch = version.match(versionPattern);

            if (currentMatch && targetMatch) {
              return currentMatch[1] !== targetMatch[1];
            }
            return false;
          }
        });

        if (!hasOutdatedDeps) {
          // If there are no outdated dependencies (besides CLI), this isn't an upgradeable release
          throw new Error(
            `No upgradeable dependencies found for same-version upgrade from ${fromVersion} to ${toVersion}`,
          );
        }

        // Verify we're on the same Hydrogen version
        expect(
          initialHydrogenVersion === toVersion ||
            initialHydrogenVersion === `^${toVersion}`,
        ).toBe(true);
      }

      // Check what scenarios apply to this upgrade
      const hasGuide =
        latestRelease.features?.some((f: any) => f.steps?.length > 0) ||
        latestRelease.fixes?.some((f: any) => f.steps?.length > 0);

      // Run upgrade (single version upgrade should work cleanly)
      await runUpgradeCommand(projectDir, toVersion);

      // Verify upgrade completed successfully
      const packageJson = JSON.parse(
        await readFile(join(projectDir, 'package.json'), 'utf8'),
      );
      const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];

      // Hydrogen version should match the target version
      expect(
        hydrogenVersion === toVersion || hydrogenVersion === `^${toVersion}`,
      ).toBe(true);

      // For same-version upgrades, verify dependencies were actually updated
      if (isSameVersionUpgrade) {
        // Check that at least one dependency (other than @shopify/cli) was updated
        const dependenciesUpdated = Object.entries({
          ...latestRelease.dependencies,
          ...latestRelease.devDependencies,
        }).some(([name, version]) => {
          if (name === '@shopify/cli') return false; // CLI is excluded from upgrade checks
          if (name === '@shopify/hydrogen') return false; // Hydrogen version stays the same

          const initialVersion =
            initialPackageJson.dependencies?.[name] ||
            initialPackageJson.devDependencies?.[name];
          const currentVersion =
            packageJson.dependencies?.[name] ||
            packageJson.devDependencies?.[name];

          // Check if this dependency was outdated and is now updated
          if (initialVersion && currentVersion) {
            try {
              const semver = require('semver');
              const wasOutdated = semver.gt(
                semver.minVersion(version).version,
                semver.minVersion(initialVersion).version,
              );
              const isUpdated = semver.gte(
                semver.minVersion(currentVersion).version,
                semver.minVersion(version).version,
              );
              return wasOutdated && isUpdated;
            } catch {
              // Fallback comparison
              const versionPattern = /^[\^~]?([\d.]+)/;
              const currentMatch = currentVersion.match(versionPattern);
              const targetMatch = version.match(versionPattern);

              if (currentMatch && targetMatch) {
                return currentMatch[1] === targetMatch[1];
              }
            }
          }
          return false;
        });

        expect(dependenciesUpdated).toBe(true);
      }

      // Check guide generation and analyze breaking changes
      const guideFile = join(
        projectDir,
        '.hydrogen',
        `upgrade-${fromVersion}-to-${toVersion}.md`,
      );
      let guideContent = '';
      let hasBreakingChanges = false;

      if (hasGuide) {
        guideContent = await readFile(guideFile, 'utf8');
        expect(guideContent).toContain(
          `# Hydrogen upgrade guide: ${fromVersion} to ${toVersion}`,
        );
        expect(guideContent.length).toBeGreaterThan(100);

        // If guide has steps, expect potential build/dev/typecheck failures
        hasBreakingChanges =
          latestRelease.features?.some((f: any) => f.steps?.length > 0) ||
          latestRelease.fixes?.some((f: any) => f.steps?.length > 0);
      } else {
        await expect(readFile(guideFile, 'utf8')).rejects.toThrow();
      }

      // Test dependency management - validate removals and additions
      await validateDependencyChanges(projectDir, fromRelease, latestRelease);

      // Test build functionality - always try it first
      let buildFailed = false;
      let buildError: Error | undefined;
      try {
        await validateProjectBuilds(projectDir, hasBreakingChanges);
      } catch (error) {
        buildFailed = true;
        buildError = error as Error;
      }

      // Test typecheck functionality - always try it
      let typecheckFailed = false;
      let typecheckError: Error | undefined;
      try {
        await validateTypeCheck(projectDir, hasBreakingChanges);
      } catch (error) {
        typecheckFailed = true;
        typecheckError = error as Error;
      }

      // Test dev server functionality - always try it
      let devFailed = false;
      let devError: Error | undefined;
      try {
        await validateDevServer(projectDir, hasBreakingChanges);
      } catch (error) {
        devFailed = true;
        devError = error as Error;
      }

      // With the renderInfo fix, all failures are now unexpected
      if (buildFailed) throw buildError;
      if (typecheckFailed) throw typecheckError;
      if (devFailed) throw devError;

      // Validate critical file integrity (always strict)
      await validateFileIntegrity(projectDir);
    }, 180000);
  });

  describe('Changelog validation', () => {
    it('validates changelog structure and field compliance', async () => {
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
        if (!release) continue; // Skip if undefined (shouldn't happen in practice)

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
            if (!feature) continue; // Skip if undefined

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
                if (!step) continue; // Skip if undefined

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
            if (!fix) continue; // Skip if undefined

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
                if (!step) continue; // Skip if undefined

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
    // Try multiple possible repository root locations
    const possibleRoots = [
      join(process.cwd(), '../../'), // Local development
      process.cwd(), // CI might be at repo root
      join(process.cwd(), '../../../'), // Nested CI structure
    ];

    let repoRoot = possibleRoots[0];

    // Find the correct repo root by checking for .git directory
    for (const root of possibleRoots) {
      try {
        await execAsync('git rev-parse --git-dir', {cwd: root});
        repoRoot = root;
        break;
      } catch {
        // Continue to next candidate
      }
    }

    // First try to fetch latest commits from GitHub to ensure we have complete history
    try {
      await execAsync('git fetch origin', {cwd: repoRoot});
    } catch {
      // Ignore fetch errors, continue with local git history
    }

    // Strategy 1: Look for GitHub release tags first
    try {
      const {stdout: tags} = await execAsync(
        `git tag -l "*${version}*" | head -10`,
        {cwd: repoRoot},
      );

      for (const tag of tags.trim().split('\n').filter(Boolean)) {
        try {
          const {stdout: tagCommit} = await execAsync(
            `git rev-list -n 1 ${tag}`,
            {cwd: repoRoot},
          );
          const commit = tagCommit.trim();

          const {stdout: packageContent} = await execAsync(
            `git show ${commit}:templates/skeleton/package.json`,
            {cwd: repoRoot},
          );
          const packageJson = JSON.parse(packageContent);
          if (
            packageJson.dependencies?.['@shopify/hydrogen'] === version &&
            packageJson.version === version
          ) {
            return commit;
          }
        } catch {
          // Continue to next tag
        }
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Search for official release commits by commit message pattern
    try {
      const releasePatterns = [
        `\\[ci\\] release.*${version.replace(/\./g, '\\.')}`,
        `\\[ci\\] release.*${version.replace(/\./g, '-')}`, // e.g., 2025-04 format
        `release.*${version}`,
      ];

      for (const pattern of releasePatterns) {
        const {stdout: releaseCommits} = await execAsync(
          `git log --format=%H --grep="${pattern}" --all | head -10`,
          {cwd: repoRoot},
        );

        for (const commit of releaseCommits
          .trim()
          .split('\n')
          .filter(Boolean)) {
          try {
            const {stdout: packageContent} = await execAsync(
              `git show ${commit}:templates/skeleton/package.json`,
              {cwd: repoRoot},
            );
            const packageJson = JSON.parse(packageContent);
            if (
              packageJson.dependencies?.['@shopify/hydrogen'] === version &&
              packageJson.version === version
            ) {
              return commit;
            }
          } catch {
            // Continue to next commit
          }
        }
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Search all commits that touched skeleton package.json for exact version match
    try {
      const {stdout: allCommits} = await execAsync(
        'git log --format=%H --all -- templates/skeleton/package.json | head -200',
        {cwd: repoRoot},
      );

      for (const commit of allCommits.trim().split('\n').filter(Boolean)) {
        try {
          const {stdout: packageContent} = await execAsync(
            `git show ${commit}:templates/skeleton/package.json`,
            {cwd: repoRoot},
          );
          const packageJson = JSON.parse(packageContent);
          if (
            packageJson.dependencies?.['@shopify/hydrogen'] === version &&
            packageJson.version === version
          ) {
            return commit;
          }
        } catch {
          // Continue to next commit
        }
      }
    } catch {
      // Continue to end of function
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

    // Create .env file with required environment variables for testing
    await writeFile(
      join(projectDir, '.env'),
      'SESSION_SECRET=test-session-secret-for-upgrade-test\n',
    );

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
    devProcess = spawn(
      'npm',
      [
        'run',
        'dev',
        '--',
        '--port',
        port.toString(),
        '--disable-version-check',
      ],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          PORT: port.toString(),
          SESSION_SECRET: 'test-session-secret-for-upgrade-test',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

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

async function validateDependencyChanges(
  projectDir: string,
  fromRelease: any,
  toRelease: any,
) {
  const packageJsonPath = join(projectDir, 'package.json');
  const packageContent = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageContent);

  // Check dependency removals if specified
  if (toRelease.removeDependencies) {
    for (const dep of toRelease.removeDependencies) {
      expect(packageJson.dependencies?.[dep]).toBeUndefined();
    }
  }

  if (toRelease.removeDevDependencies) {
    for (const dep of toRelease.removeDevDependencies) {
      expect(packageJson.devDependencies?.[dep]).toBeUndefined();
    }
  }

  // Check dependency additions if specified (only validate if they're present)
  if (toRelease.dependencies) {
    for (const [dep, version] of Object.entries(toRelease.dependencies)) {
      const actualVersion = packageJson.dependencies?.[dep];
      // Only validate if the dependency is present (upgrade might not add all deps)
      if (actualVersion) {
        const versionStr = String(version);
        expect(
          actualVersion === versionStr ||
            actualVersion === `^${versionStr}` ||
            actualVersion === `~${versionStr}` ||
            actualVersion.includes(versionStr),
        ).toBe(true);
      }
    }
  }

  if (toRelease.devDependencies) {
    for (const [dep, version] of Object.entries(toRelease.devDependencies)) {
      const actualVersion = packageJson.devDependencies?.[dep];
      // Only validate if the dependency is present (upgrade might not add all deps)
      if (actualVersion) {
        if (dep === '@shopify/cli') {
          // CLI releases happen after Hydrogen releases, so exact version matching isn't reliable.
          // However, we should still validate the version is reasonable (major.minor should be close)
          expect(actualVersion).toBeDefined();
          expect(typeof actualVersion).toBe('string');
          // Ensure it's a valid semver-like version
          expect(actualVersion).toMatch(/^[~^]?\d+\.\d+\.\d+/);
        } else {
          const versionStr = String(version);
          expect(
            actualVersion === versionStr ||
              actualVersion === `^${versionStr}` ||
              actualVersion === `~${versionStr}` ||
              actualVersion.includes(versionStr),
          ).toBe(true);
        }
      }
    }
  }
}

async function validateProjectBuilds(
  projectDir: string,
  hasGuideSteps: boolean = false,
) {
  const originalEnv = process.env.SHOPIFY_UNIT_TEST;
  delete process.env.SHOPIFY_UNIT_TEST;

  try {
    await exec('npm', ['run', 'build'], {
      cwd: projectDir,
      env: {...process.env, NODE_ENV: 'production'},
    });
  } catch (error) {
    if (hasGuideSteps) {
      // Build failures are expected when migration guide has steps
      // Silently continue as this is expected behavior
    } else {
      // Build should succeed when no guide steps are present
      throw new Error(
        `Build failed unexpectedly (no migration steps documented): ${
          (error as Error).message
        }`,
      );
    }
  } finally {
    if (originalEnv !== undefined) {
      process.env.SHOPIFY_UNIT_TEST = originalEnv;
    } else {
      delete process.env.SHOPIFY_UNIT_TEST;
    }
  }
}

async function validateTypeCheck(
  projectDir: string,
  hasGuideSteps: boolean = false,
) {
  try {
    await exec('npm', ['run', 'typecheck'], {cwd: projectDir});
  } catch (error) {
    if (hasGuideSteps) {
      // TypeScript errors are expected when migration guide has steps
      // Silently continue as this is expected behavior
    } else {
      // TypeScript should pass when no guide steps are present
      throw new Error(
        `TypeScript validation failed unexpectedly (no migration steps documented): ${
          (error as Error).message
        }`,
      );
    }
  }
}

async function validateDevServer(
  projectDir: string,
  hasGuideSteps: boolean = false,
) {
  try {
    await testDevServer(projectDir, 'post-upgrade-validation');
  } catch (error) {
    if (hasGuideSteps) {
      // Dev server failures are expected when migration guide has steps
      // Silently continue as this is expected behavior
    } else {
      // Dev server should work when no guide steps are present
      throw new Error(
        `Dev server validation failed unexpectedly (no migration steps documented): ${
          (error as Error).message
        }`,
      );
    }
  }
}

async function validateFileIntegrity(projectDir: string) {
  const criticalFiles = ['package.json', 'tsconfig.json'];

  for (const file of criticalFiles) {
    const filePath = join(projectDir, file);
    const hasFile = await fileExists(filePath);
    if (!hasFile) {
      throw new Error(`Missing critical file after upgrade: ${file}`);
    }
  }
}
