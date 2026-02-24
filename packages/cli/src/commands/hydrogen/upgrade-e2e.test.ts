/**
 * E2E tests for `h2 upgrade` command.
 *
 * Environment variables:
 *   UPGRADE_TEST_FROM=<version>   - Test from specific version
 *   UPGRADE_TEST_TO=<version>     - Test to specific version (default: latest)
 *   UPGRADE_TEST_LAST_N=<number>  - Test last N versions
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {readFile, unlink, writeFile} from 'node:fs/promises';
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

function parseCalverVersion(version: string): [number, number, number] | null {
  const match = version.match(/^(\d{4})\.(\d+)\.(\d+)$/);

  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function getMajorVersion(version: string): string | null {
  const parsed = parseCalverVersion(version);

  if (!parsed) {
    return null;
  }

  return `${parsed[0]}.${parsed[1]}`;
}

function compareCalverVersion(a: string, b: string): number {
  const parsedA = parseCalverVersion(a);
  const parsedB = parseCalverVersion(b);

  if (!parsedA || !parsedB) {
    return a.localeCompare(b);
  }

  if (parsedA[0] !== parsedB[0]) {
    return parsedA[0] - parsedB[0];
  }

  if (parsedA[1] !== parsedB[1]) {
    return parsedA[1] - parsedB[1];
  }

  return parsedA[2] - parsedB[2];
}

function parseReleaseDate(date?: string | null): Date | null {
  if (!date) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getTargetReleaseDate(targetRelease: Release): Date {
  return parseReleaseDate(targetRelease.date) ?? new Date();
}

function getIntermediateReleases({
  changelog,
  fromVersion,
  toVersion,
}: {
  changelog: ChangeLog;
  fromVersion: string;
  toVersion: string;
}): Release[] {
  return changelog.releases.filter((release) => {
    return (
      compareCalverVersion(release.version, fromVersion) > 0 &&
      compareCalverVersion(release.version, toVersion) < 0
    );
  });
}

function getDefaultVersionMatrix(
  changelog: ChangeLog,
  targetVersion: string,
  targetIndex: number,
  targetRelease: Release,
): Array<[string, string]> {
  const targetDate = getTargetReleaseDate(targetRelease);
  const cutoffDate = new Date(targetDate);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 365);

  const groupedByMajor = new Map<string, Release>();

  for (const release of changelog.releases.slice(targetIndex + 1)) {
    const majorVersion = getMajorVersion(release.version);
    const releaseDate = parseReleaseDate(release.date);

    if (!majorVersion || !releaseDate || releaseDate < cutoffDate) {
      continue;
    }

    const current = groupedByMajor.get(majorVersion);
    if (!current) {
      groupedByMajor.set(majorVersion, release);
      continue;
    }

    if (compareCalverVersion(release.version, current.version) > 0) {
      groupedByMajor.set(majorVersion, release);
    }
  }

  const selectedVersions = [...groupedByMajor.values()]
    .sort((a, b) => compareCalverVersion(b.version, a.version))
    .map((release) => release.version);

  if (selectedVersions.length > 0) {
    const oldestVersion = selectedVersions[selectedVersions.length - 1];
    console.log(
      `Testing ${selectedVersions.length} major versions from last 365 days: ${oldestVersion} → ${targetVersion}`,
    );
    return selectedVersions.map((version) => [version, targetVersion]);
  }

  const previousVersion = changelog.releases[targetIndex + 1]?.version;
  if (!previousVersion) {
    throw new Error(
      `Need at least one version before ${targetVersion} for testing`,
    );
  }

  console.log(`Testing fallback: ${previousVersion} → ${targetVersion}`);
  return [[previousVersion, targetVersion]];
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

  if (fromEnv) {
    if (!parseCalverVersion(fromEnv)) {
      throw new Error(
        `FROM version ${fromEnv} must be in YYYY.M.P format (example: 2025.5.0)`,
      );
    }

    if (!changelog.releases.some((release) => release.version === fromEnv)) {
      throw new Error(`FROM version ${fromEnv} not found in changelog`);
    }

    console.log(`Testing: ${fromEnv} → ${targetVersion}`);
    return [[fromEnv, targetVersion]];
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

  return getDefaultVersionMatrix(
    changelog,
    targetVersion,
    targetIndex,
    targetRelease,
  );
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

    for (const [fromVersion, toVersion] of matrix) {
      await testUpgrade(fromVersion, toVersion, changelog);
    }
  }, 600000);
});

async function testUpgrade(
  fromVersion: string,
  toVersion: string,
  changelog: ChangeLog,
): Promise<void> {
  const toRelease = changelog.releases.find((r) => r.version === toVersion);

  if (!toRelease) {
    throw new Error(`Could not find target release ${toVersion} in changelog`);
  }

  const intermediateReleases = getIntermediateReleases({
    changelog,
    fromVersion,
    toVersion,
  });

  const hasIntermediateSteps = intermediateReleases.some(
    (r) =>
      r.features?.some((f) => f.steps && f.steps.length > 0) ||
      r.fixes?.some((f) => f.steps && f.steps.length > 0),
  );

  const hasBreakingChanges =
    toRelease.features?.some((f) => f.breaking) ||
    toRelease.fixes?.some((f) => f.breaking) ||
    intermediateReleases.some(
      (r) =>
        r.features?.some((f) => f.breaking) || r.fixes?.some((f) => f.breaking),
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
      changelog,
    );

    const initialPackageJson = JSON.parse(
      await readFile(join(projectDir, 'package.json'), 'utf8'),
    );

    const initialHydrogenVersion =
      initialPackageJson.dependencies?.['@shopify/hydrogen'];

    expect(initialHydrogenVersion).toBeDefined();
    const currentVersion = stripVersionPrefix(initialHydrogenVersion);
    expect(currentVersion).toBe(skeletonVersion);

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
      if (actualVersion) {
        validateDependencyVersion(
          actualVersion,
          expectedVersion,
          dep,
          'dependency',
        );
      }
    }

    for (const [dep, expectedVersion] of Object.entries(
      toRelease.devDependencies ?? {},
    )) {
      const actualVersion = upgradedPackageJson.devDependencies?.[dep];
      if (actualVersion) {
        validateDependencyVersion(
          actualVersion,
          expectedVersion,
          dep,
          'devDependency',
        );
      }
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
      `upgrade-${currentVersion}-to-${toVersion}.md`,
    );

    if (hasUpgradeSteps) {
      const guideContent = await readFile(guideFile, 'utf8');
      expect(guideContent).toContain(
        `# Hydrogen upgrade guide: ${currentVersion} to ${toVersion}`,
      );
    } else {
      await expect(readFile(guideFile, 'utf8')).rejects.toThrow();
    }

    try {
      await exec('npm', ['install'], {cwd: projectDir});
    } catch (error) {
      throw new Error(
        `npm install failed for ${fromVersion} → ${toVersion}.\n` +
          `Changelog may be incomplete or inaccurate for this upgrade path.\n\n` +
          `Changelog entry for ${toVersion}:\n${JSON.stringify(toRelease, null, 2)}\n\n` +
          `Original error: ${(error as Error).message}`,
      );
    }

    // Projects with manual upgrade steps (e.g. codemods, config changes) may not build
    // until those steps are applied by the developer, so we only validate the build
    // for releases that can be applied purely through dependency changes and do not
    // include breaking changes.
    if (!hasUpgradeSteps && !hasBreakingChanges) {
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
            `Changelog may be incomplete or inaccurate for this upgrade path.\n\n` +
            `Changelog entry:\n${JSON.stringify(toRelease, null, 2)}\n\n` +
            `Original error: ${(error as Error).message}`,
        );
      }
    } else {
      const reason = hasUpgradeSteps
        ? 'manual steps required'
        : 'breaking changes';
      const skeletonNote =
        skeletonVersion !== fromVersion
          ? ` (scaffolded on ${skeletonVersion})`
          : '';
      console.log(
        `✓ ${fromVersion} → ${toVersion}${skeletonNote} [${reason}, build skipped]`,
      );
    }
  });
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

async function isMatchingSkeletonCommit({
  repoRoot,
  commit,
  version,
}: {
  repoRoot: string;
  commit: string;
  version: string;
}): Promise<boolean> {
  try {
    const {stdout: packageContent} = await execAsync(
      `git show ${commit}:templates/skeleton/package.json`,
      {cwd: repoRoot},
    );
    const packageJson = JSON.parse(packageContent);

    return (
      packageJson.dependencies?.['@shopify/hydrogen'] === version &&
      packageJson.version === version
    );
  } catch {
    return false;
  }
}

async function scaffoldProjectAtVersion(
  tempDir: string,
  version: string,
  changelog: ChangeLog,
): Promise<{projectDir: string; skeletonVersion: string}> {
  const projectDir = join(tempDir, 'test-project');
  const repoRoot = join(process.cwd(), '../../');

  const release = changelog.releases.find((item) => item.version === version);

  let commit: string | undefined = release?.hash;
  let skeletonVersion = version;

  if (commit) {
    const isValidVersionCommit = await isMatchingSkeletonCommit({
      repoRoot,
      commit,
      version,
    });

    if (!isValidVersionCommit) {
      console.warn(
        `⚠️  Hash ${commit} for ${version} does not contain matching skeleton package.json. ` +
          `Falling back to git search for a matching skeleton commit.`,
      );
      commit = undefined;
    }
  }

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

  const archivePath = join(tempDir, 'skeleton.tar');

  try {
    await exec(
      'git',
      [
        'archive',
        '--format=tar',
        commit,
        '--output',
        archivePath,
        '--',
        'templates/skeleton',
      ],
      {
        cwd: repoRoot,
      },
    );
    await exec('tar', [
      '-x',
      '-f',
      archivePath,
      '-C',
      tempDir,
      '--exclude=templates/skeleton/.cursor',
    ]);
  } catch (error) {
    throw new Error(
      `Failed to extract skeleton template from commit ${commit} (version ${skeletonVersion}).\n` +
        `This might indicate the commit doesn't exist or templates/skeleton path doesn't exist in that commit.\n` +
        `Original error: ${(error as Error).message}`,
    );
  } finally {
    await unlink(archivePath).catch(() => {});
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

  await writeFile(
    join(projectDir, '.env'),
    'SESSION_SECRET=test-session-secret-for-upgrade-test\n',
  );

  return {projectDir, skeletonVersion};
}
