/**
 * E2E tests for `h2 upgrade` command.
 *
 * Environment variables:
 *   UPGRADE_TEST_FROM=<version>   - Test from specific version
 *   UPGRADE_TEST_TO=<version>     - Test to specific version (default: latest)
 *   UPGRADE_TEST_LAST_N=<number>  - Test last N versions
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {exec} from '@shopify/cli-kit/node/system';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {execAsync} from '../../lib/process.js';
import * as upgradeModule from './upgrade.js';
import type {Release} from './upgrade.js';

type ChangeLog = Awaited<ReturnType<typeof upgradeModule.getChangelog>>;

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderTasks: vi.fn(async (tasks) => {
      for (const task of tasks) {
        if (task.task && typeof task.task === 'function') {
          await task.task();
        }
      }
    }),
    renderSelectPrompt: vi.fn(() => Promise.resolve()),
    renderConfirmationPrompt: vi.fn(() => Promise.resolve(true)),
    renderInfo: vi.fn(() => {}),
    renderSuccess: vi.fn(() => {}),
  };
});

vi.mock('../../lib/shell.js', () => ({getCliCommand: vi.fn(() => 'h2')}));

const commitCache = new Map<string, string | null>();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function stripVersionPrefix(version: string): string {
  return version.replace(/^[\^~]/, '');
}

function validateDependencyVersion(
  actualVersion: string,
  expectedVersion: string,
  depName: string,
  depType: 'dependency' | 'devDependency',
): void {
  expect(
    actualVersion,
    `${depType} ${depName} should be present after upgrade`,
  ).toBeDefined();

  const expectedBase = stripVersionPrefix(String(expectedVersion));
  const actualBase = stripVersionPrefix(actualVersion);

  expect(actualBase, `${depType} ${depName} version mismatch`).toBe(
    expectedBase,
  );
}

function createVersionMatrix(changelog: ChangeLog): Array<[string, string]> {
  const latestVersion = changelog.releases[0]?.version;

  if (!latestVersion) {
    throw new Error('No releases found in changelog');
  }

  const fromEnv = process.env.UPGRADE_TEST_FROM;
  const toEnv = process.env.UPGRADE_TEST_TO;
  const lastN = process.env.UPGRADE_TEST_LAST_N
    ? parseInt(process.env.UPGRADE_TEST_LAST_N, 10)
    : null;

  const targetVersion = toEnv || latestVersion;
  const targetIndex = changelog.releases.findIndex(
    (r) => r.version === targetVersion,
  );

  if (targetIndex === -1) {
    throw new Error(`Target version ${targetVersion} not found in changelog`);
  }

  const targetRelease = changelog.releases[targetIndex]!;

  const targetHasBreaking =
    targetRelease.features?.some((f) => f.breaking) ||
    targetRelease.fixes?.some((f) => f.breaking);

  if (fromEnv) {
    if (!changelog.releases.some((r) => r.version === fromEnv)) {
      throw new Error(`FROM version ${fromEnv} not found in changelog`);
    }

    if (targetHasBreaking) {
      console.log(
        `⊘ Skipping ${fromEnv} → ${targetVersion}: target has breaking changes`,
      );
      return [];
    }

    console.log(`Testing: ${fromEnv} → ${targetVersion}`);
    return [[fromEnv, targetVersion]];
  }

  if (targetHasBreaking) {
    console.log(`⊘ Skipping ${targetVersion}: target has breaking changes`);
    return [];
  }

  if (lastN && lastN >= 1) {
    const matrix: Array<[string, string]> = [];
    const startIndex = targetIndex + 1;
    const endIndex = Math.min(startIndex + lastN, changelog.releases.length);

    for (let i = startIndex; i < endIndex; i++) {
      const release = changelog.releases[i];
      if (!release) continue;

      matrix.push([release.version, targetVersion]);
    }

    if (matrix.length > 0) {
      const oldestVersion = matrix[matrix.length - 1]?.[0];
      const countNote = matrix.length < lastN ? ` of ${lastN} requested` : '';
      console.log(
        `Testing last ${matrix.length}${countNote}: ${oldestVersion} → ${targetVersion}`,
      );
    }

    return matrix;
  }

  const previousVersion = changelog.releases[targetIndex + 1]?.version;
  if (!previousVersion) {
    throw new Error(
      `Need at least one version before ${targetVersion} for testing`,
    );
  }

  console.log(`Testing: ${previousVersion} → ${targetVersion}`);
  return [[previousVersion, targetVersion]];
}

describe('upgrade e2e', () => {
  it('runs upgrade tests for version matrix', async () => {
    vi.stubEnv('FORCE_CHANGELOG_SOURCE', 'local');
    vi.stubEnv('SHOPIFY_HYDROGEN_FLAG_FORCE', '1');
    vi.stubEnv('CI', '1');

    const changelog = await upgradeModule.getChangelog();
    const matrix = createVersionMatrix(changelog);

    if (matrix.length === 0) {
      console.log('⊘ No upgrade paths to test');
      return;
    }

    let stoppedEarly = false;
    let stoppedAtIndex = 0;

    for (let i = 0; i < matrix.length; i++) {
      const [fromVersion, toVersion] = matrix[i]!;
      const shouldSkip = await testUpgrade(fromVersion, toVersion, changelog);

      if (shouldSkip) {
        stoppedEarly = true;
        stoppedAtIndex = i;
        break;
      }
    }

    if (stoppedEarly && stoppedAtIndex < matrix.length - 1) {
      const remaining = matrix.length - stoppedAtIndex - 1;
      console.log(
        `⊘ Stopped early due to breaking changes (${remaining} remaining path${remaining === 1 ? '' : 's'} would also skip)`,
      );
    }
  }, 600000);
});

async function testUpgrade(
  fromVersion: string,
  toVersion: string,
  changelog: ChangeLog,
): Promise<boolean> {
  const fromRelease = changelog.releases.find((r) => r.version === fromVersion);
  const toRelease = changelog.releases.find((r) => r.version === toVersion);

  if (!fromRelease || !toRelease) {
    throw new Error(
      `Could not find releases for ${fromVersion} or ${toVersion}`,
    );
  }

  const fromIndex = changelog.releases.findIndex(
    (r) => r.version === fromVersion,
  );
  const toIndex = changelog.releases.findIndex((r) => r.version === toVersion);

  const intermediateReleases = changelog.releases.slice(toIndex + 1, fromIndex);
  const hasIntermediateBreaking = intermediateReleases.some(
    (r) =>
      r.features?.some((f) => f.breaking) || r.fixes?.some((f) => f.breaking),
  );

  if (hasIntermediateBreaking) {
    console.log(
      `⊘ Skipping ${fromVersion} → ${toVersion}: intermediate breaking changes`,
    );
    return true;
  }

  const hasIntermediateSteps = intermediateReleases.some(
    (r) =>
      r.features?.some((f) => f.steps && f.steps.length > 0) ||
      r.fixes?.some((f) => f.steps && f.steps.length > 0),
  );

  const packagesToCheck: Array<[string, string | undefined]> = [
    ['@shopify/hydrogen', toRelease.dependencies?.['@shopify/hydrogen']],
  ];

  if (toRelease.devDependencies?.['@shopify/mini-oxygen']) {
    packagesToCheck.push([
      '@shopify/mini-oxygen',
      toRelease.devDependencies['@shopify/mini-oxygen'],
    ]);
  }

  const {published, missing} = await arePackagesPublished(packagesToCheck);

  if (!published) {
    throw new Error(
      `Required packages not yet published to npm: ${missing.join(', ')}.`,
    );
  }

  await inTemporaryDirectory(async (tempDir) => {
    const {projectDir, skeletonVersion} = await scaffoldProjectAtVersion(
      tempDir,
      fromVersion,
      fromRelease,
      changelog,
    );

    const initialPackageJson = JSON.parse(
      await readFile(join(projectDir, 'package.json'), 'utf8'),
    );

    const initialHydrogenVersion =
      initialPackageJson.dependencies?.['@shopify/hydrogen'];

    expect(initialHydrogenVersion).toBeDefined();
    expect(stripVersionPrefix(initialHydrogenVersion)).toBe(fromVersion);

    try {
      await upgradeModule.runUpgrade({
        appPath: projectDir,
        version: toVersion,
        force: true,
      });
    } catch (error) {
      throw new Error(
        `Upgrade command failed for ${fromVersion} → ${toVersion}.\n` +
          `Original error: ${(error as Error).message}`,
      );
    }

    const upgradedPackageJson = JSON.parse(
      await readFile(join(projectDir, 'package.json'), 'utf8'),
    );
    const upgradedHydrogenVersion =
      upgradedPackageJson.dependencies?.['@shopify/hydrogen'];

    expect(upgradedHydrogenVersion).toBeDefined();
    expect(stripVersionPrefix(upgradedHydrogenVersion)).toBe(toVersion);

    for (const [dep, expectedVersion] of Object.entries(
      toRelease.dependencies ?? {},
    )) {
      const actualVersion = upgradedPackageJson.dependencies?.[dep];
      validateDependencyVersion(
        actualVersion,
        expectedVersion,
        dep,
        'dependency',
      );
    }

    for (const [dep, expectedVersion] of Object.entries(
      toRelease.devDependencies ?? {},
    )) {
      const actualVersion = upgradedPackageJson.devDependencies?.[dep];
      validateDependencyVersion(
        actualVersion,
        expectedVersion,
        dep,
        'devDependency',
      );
    }

    if (toRelease.removeDependencies) {
      for (const dep of toRelease.removeDependencies) {
        const isReinstalled =
          (toRelease.dependencies && dep in toRelease.dependencies) ||
          (toRelease.devDependencies && dep in toRelease.devDependencies);

        if (!isReinstalled) {
          expect(upgradedPackageJson.dependencies?.[dep]).toBeUndefined();
          expect(upgradedPackageJson.devDependencies?.[dep]).toBeUndefined();
        }
      }
    }

    if (toRelease.removeDevDependencies) {
      for (const dep of toRelease.removeDevDependencies) {
        const isReinstalled =
          (toRelease.dependencies && dep in toRelease.dependencies) ||
          (toRelease.devDependencies && dep in toRelease.devDependencies);

        if (!isReinstalled) {
          expect(upgradedPackageJson.dependencies?.[dep]).toBeUndefined();
          expect(upgradedPackageJson.devDependencies?.[dep]).toBeUndefined();
        }
      }
    }

    const hasUpgradeSteps =
      toRelease.features?.some((f) => f.steps && f.steps.length > 0) ||
      toRelease.fixes?.some((f) => f.steps && f.steps.length > 0) ||
      hasIntermediateSteps;

    const guideFile = join(
      projectDir,
      '.hydrogen',
      `upgrade-${fromVersion}-to-${toVersion}.md`,
    );

    if (hasUpgradeSteps) {
      const guideContent = await readFile(guideFile, 'utf8');
      expect(guideContent).toContain(
        `# Hydrogen upgrade guide: ${fromVersion} to ${toVersion}`,
      );
      expect(guideContent.length).toBeGreaterThan(100);
    } else {
      await expect(readFile(guideFile, 'utf8')).rejects.toThrow();
    }

    try {
      await exec('npm', ['install'], {cwd: projectDir});
    } catch (error) {
      throw new Error(
        `npm install failed for ${fromVersion} → ${toVersion}.\n` +
          `This indicates the upgrade path doesn't work automatically:\n` +
          `  - If jumping multiple versions: May need incremental upgrades or missing cumulative deps\n` +
          `  - May need removeDependencies array (e.g., peer dependency conflicts)\n` +
          `  - May need breaking: true flag\n` +
          `  - May need manual upgrade steps\n\n` +
          `Changelog entry for ${toVersion}:\n${JSON.stringify(toRelease, null, 2)}\n\n` +
          `Original error: ${(error as Error).message}`,
      );
    }

    // Projects with manual upgrade steps (e.g. codemods, config changes) may not build
    // until those steps are applied by the developer, so we only validate the build
    // for releases that can be applied purely through dependency changes.
    if (!hasUpgradeSteps) {
      try {
        await exec('npx', ['@shopify/cli', 'hydrogen', 'build', '--codegen'], {
          cwd: projectDir,
          env: {...process.env, NODE_ENV: 'production'},
        });
        const skeletonNote =
          skeletonVersion !== fromVersion
            ? ` (scaffolded on ${skeletonVersion})`
            : '';
        console.log(`✓ ${fromVersion} → ${toVersion}${skeletonNote}`);
      } catch (error) {
        throw new Error(
          `Build failed for ${fromVersion} → ${toVersion}.\n` +
            `The changelog does NOT indicate breaking changes or manual steps.\n` +
            `This likely means the changelog entry is incomplete:\n` +
            `  - May need breaking: true flag\n` +
            `  - May need manual upgrade steps with instructions\n` +
            `  - May need additional dependencies specified\n\n` +
            `Changelog entry:\n${JSON.stringify(toRelease, null, 2)}\n\n` +
            `Original error: ${(error as Error).message}`,
        );
      }
    } else {
      const skeletonNote =
        skeletonVersion !== fromVersion
          ? ` (scaffolded on ${skeletonVersion})`
          : '';
      console.log(
        `✓ ${fromVersion} → ${toVersion}${skeletonNote} [manual steps required, build skipped]`,
      );
    }
  });

  return false;
}

async function arePackagesPublished(
  packages: Array<[string, string | undefined]>,
): Promise<{published: boolean; missing: string[]}> {
  const packagesToCheck = packages.filter(([, version]) => version);
  const missing: string[] = [];

  for (const [packageName, version] of packagesToCheck) {
    try {
      await exec('npm', ['view', `${packageName}@${version}`, 'version'], {
        cwd: process.cwd(),
      });
    } catch {
      missing.push(`${packageName}@${version}`);
    }
  }

  return {
    published: missing.length === 0,
    missing,
  };
}

async function findCommitForVersion(version: string): Promise<string | null> {
  try {
    const possibleRoots = [
      join(process.cwd(), '../../'),
      process.cwd(),
      join(process.cwd(), '../../../'),
    ];

    let repoRoot = possibleRoots[0];

    for (const root of possibleRoots) {
      try {
        await execAsync('git rev-parse --git-dir', {cwd: root});
        repoRoot = root;
        break;
      } catch {
        continue;
      }
    }

    try {
      await execAsync('git fetch origin', {cwd: repoRoot});
    } catch {}

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
          continue;
        }
      }
    } catch {}

    try {
      const releasePatterns = [
        `\\[ci\\] release.*${version.replace(/\./g, '\\.')}`,
        `\\[ci\\] release.*${version.replace(/\./g, '-')}`,
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
            continue;
          }
        }
      }
    } catch {}

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
          continue;
        }
      }
    } catch {}

    return null;
  } catch {
    return null;
  }
}

async function findCommitForVersionCached(
  version: string,
): Promise<string | null> {
  const cached = commitCache.get(version);
  if (cached !== undefined) {
    return cached;
  }

  const commit = await findCommitForVersion(version);
  commitCache.set(version, commit);
  return commit;
}

async function scaffoldProjectAtVersion(
  tempDir: string,
  version: string,
  release: Release,
  changelog: ChangeLog,
): Promise<{projectDir: string; skeletonVersion: string}> {
  const projectDir = join(tempDir, 'test-project');
  const repoRoot = join(process.cwd(), '../../');

  let commit: string | undefined = release.hash;
  let skeletonVersion = version;

  if (commit) {
    try {
      await exec('git', ['cat-file', '-e', commit], {cwd: repoRoot});
    } catch {
      console.warn(
        `⚠️  Hash ${commit} for ${version} not found in local git history. ` +
          `Falling back to git search (slower). This can happen with squashed history or shallow clones.`,
      );
      commit = undefined;
    }
  }

  if (!commit) {
    const foundCommit = await findCommitForVersionCached(version);
    if (foundCommit) {
      commit = foundCommit;
    }
  }

  // Not all releases include skeleton template changes. For example, a release
  // might only update @shopify/hydrogen internals. In these cases, use the most
  // recent skeleton template that existed before this version.
  if (!commit) {
    const versionIndex = changelog.releases.findIndex(
      (r) => r.version === version,
    );

    if (versionIndex >= 0 && versionIndex < changelog.releases.length - 1) {
      const previousRelease = changelog.releases[versionIndex + 1];
      if (previousRelease) {
        const foundCommit =
          previousRelease.hash ||
          (await findCommitForVersionCached(previousRelease.version));
        if (foundCommit) {
          commit = foundCommit;
          skeletonVersion = previousRelease.version;
        }
      }
    }

    if (!commit) {
      throw new Error(
        `Could not find git commit for version ${version} or any previous version.\n` +
          `This version likely never had a skeleton template release.`,
      );
    }
  }

  try {
    await exec(
      'sh',
      [
        '-c',
        `git archive ${commit} -- templates/skeleton | tar -x -C ${tempDir} --exclude='templates/skeleton/.cursor'`,
      ],
      {
        cwd: repoRoot,
      },
    );
  } catch (error) {
    throw new Error(
      `Failed to extract skeleton template from commit ${commit} (version ${skeletonVersion}).\n` +
        `This might indicate the commit doesn't exist or templates/skeleton path doesn't exist in that commit.\n` +
        `Original error: ${(error as Error).message}`,
    );
  }

  const skeletonPath = join(tempDir, 'templates/skeleton');

  try {
    await readFile(join(skeletonPath, 'package.json'), 'utf8');
  } catch (error) {
    throw new Error(
      `Skeleton template was not extracted successfully from commit ${commit} (version ${skeletonVersion}).\n` +
        `Expected path ${skeletonPath} does not exist or is missing package.json.\n` +
        `This might indicate templates/skeleton doesn't exist at that commit.`,
    );
  }

  await exec('mv', [skeletonPath, projectDir]);

  const packageJsonPath = join(projectDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  if (release.dependencies) {
    packageJson.dependencies ??= {};
    for (const [dep, ver] of Object.entries(release.dependencies)) {
      packageJson.dependencies[dep] = ver;
    }
  }

  if (release.devDependencies) {
    packageJson.devDependencies ??= {};
    for (const [dep, ver] of Object.entries(release.devDependencies)) {
      packageJson.devDependencies[dep] = ver;
    }
  }

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

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

  await exec('npm', ['install'], {cwd: projectDir});

  await writeFile(
    join(projectDir, '.env'),
    'SESSION_SECRET=test-session-secret-for-upgrade-test\n',
  );

  return {projectDir, skeletonVersion};
}
