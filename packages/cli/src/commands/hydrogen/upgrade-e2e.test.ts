/**
 * E2E tests for `h2 upgrade` command.
 *
 * These tests validate that the upgrade command correctly updates dependencies,
 * generates upgrade guides, and maintains project compatibility across versions.
 * Tests scaffold real projects from git history and run full upgrade flows.
 *
 * Run via: .github/workflows/test-upgrade-flow.yml
 * Not included in the regular `pnpm test` suite (excluded via `vitest.config.ts`
 * pattern `**\/*-e2e.test.ts`) because they require full git history
 * (fetch-depth: 0) to scaffold historical skeleton templates.
 *
 * Environment variables:
 *   UPGRADE_TEST_FROM=<version>   - Test from specific version
 *   UPGRADE_TEST_TO=<version>     - Test to specific version (default: latest)
 *   UPGRADE_TEST_LAST_N=<number>  - Test last N versions
 *   FORCE_CHANGELOG_SOURCE=local  - Read changelog from local file (set by tests)
 *   SHOPIFY_HYDROGEN_FLAG_FORCE=1 - Skip interactive prompts (set by tests)
 *   CI=1                          - Enable CI mode (set by tests)
 *
 * Key design decisions:
 *   - Uses git archive instead of npm for scaffolding because npm packages may not
 *     exist for older/unpublished versions, and git gives us exact skeleton state
 *   - Skips build validation when manual steps or breaking changes are present
 *     because developers must apply those steps before the project will build
 *   - Falls back through multiple git search strategies (tags → release commits →
 *     package.json history) because different versions may be tagged differently
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {execFile} from 'node:child_process';
import {readFile, rename, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {exec} from '@shopify/cli-kit/node/system';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';

const execFileAsync = promisify(execFile) as (
  file: string,
  args: string[],
  options: {cwd: string},
) => Promise<{stdout: string; stderr: string}>;
import * as upgradeModule from './upgrade.js';
import type {Release} from './upgrade.js';

type ChangeLog = Awaited<ReturnType<typeof upgradeModule.getChangelog>>;

class ScaffoldNotFoundError extends Error {}

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
const DEFAULT_LOOKBACK_PERIOD_IN_DAYS = 365;

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
  depType: string,
): void {
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
    throw new Error(
      `compareCalverVersion: expected CalVer format (YYYY.M.P), got: "${!parsedA ? a : b}"`,
    );
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
  cutoffDate.setUTCDate(
    cutoffDate.getUTCDate() - DEFAULT_LOOKBACK_PERIOD_IN_DAYS,
  );

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
      `Testing ${selectedVersions.length} major versions from last ${DEFAULT_LOOKBACK_PERIOD_IN_DAYS} days: ${oldestVersion} → ${targetVersion}`,
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

  const targetVersion = toEnv ?? latestVersion;
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

    if (matrix.length === 0) {
      throw new Error(
        `UPGRADE_TEST_LAST_N=${lastN} requested but no releases exist before ${targetVersion}`,
      );
    }

    const oldestVersion = matrix[matrix.length - 1]?.[0];
    const countNote = matrix.length < lastN ? ` of ${lastN} requested` : '';
    console.log(
      `Testing last ${matrix.length}${countNote}: ${oldestVersion} → ${targetVersion}`,
    );

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

    let testedCount = 0;

    for (const [fromVersion, toVersion] of matrix) {
      try {
        await testUpgrade(fromVersion, toVersion, changelog);
        testedCount++;
      } catch (error) {
        if (error instanceof ScaffoldNotFoundError) {
          console.warn(
            `⊘ Skipping ${fromVersion} → ${toVersion}: no valid scaffold commit found ` +
              `(changelog data quality issue, not an upgrade bug).`,
          );
          continue;
        }
        throw error;
      }
    }

    const skippedCount = matrix.length - testedCount;
    console.log(
      `Tested ${testedCount}/${matrix.length} upgrade paths` +
        (skippedCount > 0
          ? `, ${skippedCount} skipped due to missing scaffolds`
          : ''),
    );

    if (testedCount === 0 && matrix.length > 0) {
      throw new Error(
        `No upgrade paths could be tested — all ${matrix.length} matrix entries failed to ` +
          `scaffold. Check changelog.json commit hashes or run with UPGRADE_TEST_FROM/TO.`,
      );
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
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Upgrade command failed for ${fromVersion} → ${toVersion}.\n` +
          `Original error: ${message}`,
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
      expect(
        actualVersion,
        `${dep} should be present in dependencies after upgrade to ${toVersion}`,
      ).toBeDefined();
      validateDependencyVersion(
        actualVersion!,
        expectedVersion,
        dep,
        'dependency',
      );
    }

    for (const [dep, expectedVersion] of Object.entries(
      toRelease.devDependencies ?? {},
    )) {
      const actualVersion = upgradedPackageJson.devDependencies?.[dep];
      expect(
        actualVersion,
        `${dep} should be present in devDependencies after upgrade to ${toVersion}`,
      ).toBeDefined();
      validateDependencyVersion(
        actualVersion!,
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

    // Verify cumulative intermediate dependencies are applied (not just toRelease).
    // This exercises the core getCumulativeRelease logic for multi-version jumps.
    //
    // Multiple intermediate releases may update the same dep (e.g., release A
    // sets foo@1.0, then release B sets foo@2.0). The production code uses
    // last-write-wins in chronological order, so we mirror that here: build
    // maps of the final expected version for each dep, then validate once.
    // Note: intermediateReleases is newest-first (changelog order), so we
    // reverse to iterate oldest-first and let the newest version win via
    // last-write-wins.
    const finalIntermediateDeps = new Map<string, string>();
    const finalIntermediateDevDeps = new Map<string, string>();

    for (const release of [...intermediateReleases].reverse()) {
      for (const [dep, version] of Object.entries(release.dependencies ?? {})) {
        finalIntermediateDeps.set(dep, version);
      }
      for (const [dep, version] of Object.entries(
        release.devDependencies ?? {},
      )) {
        finalIntermediateDevDeps.set(dep, version);
      }
    }

    for (const [dep, expectedVersion] of finalIntermediateDeps) {
      if (toRelease.dependencies?.[dep]) continue;
      if (toRelease.removeDependencies?.includes(dep)) continue;

      const actualVersion = upgradedPackageJson.dependencies?.[dep];
      // Skip deps not present in the upgraded project. An intermediate
      // release may declare deps that don't apply to every starting version
      // (e.g., the project never had the dep in the first place).
      if (actualVersion) {
        validateDependencyVersion(
          actualVersion,
          expectedVersion,
          dep,
          'cumulative dependency',
        );
      }
    }

    for (const [dep, expectedVersion] of finalIntermediateDevDeps) {
      if (toRelease.devDependencies?.[dep]) continue;
      if (toRelease.removeDevDependencies?.includes(dep)) continue;

      const actualVersion = upgradedPackageJson.devDependencies?.[dep];
      // Same rationale as above: skip deps absent from the project.
      if (actualVersion) {
        validateDependencyVersion(
          actualVersion,
          expectedVersion,
          dep,
          'cumulative devDependency',
        );
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

    // Intermediate-state projects (manual steps or breaking changes) have
    // expected peer dep conflicts from old-era transitive deps that the
    // developer must manually migrate. Use --legacy-peer-deps so we still
    // validate the changelog's declared dependencies resolve.
    // Clean paths use strict resolution to catch incomplete changelogs.
    const installArgs =
      hasUpgradeSteps || hasBreakingChanges ? ['--legacy-peer-deps'] : [];

    try {
      await exec('npm', ['install', ...installArgs], {cwd: projectDir});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `npm install failed for ${fromVersion} → ${toVersion}.\n` +
          `Changelog may be incomplete or inaccurate for this upgrade path.\n\n` +
          `Changelog entry for ${toVersion}:\n${JSON.stringify(toRelease, null, 2)}\n\n` +
          `Original error: ${message}`,
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
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Build failed for ${fromVersion} → ${toVersion}.\n` +
            `Changelog may be incomplete or inaccurate for this upgrade path.\n\n` +
            `Changelog entry:\n${JSON.stringify(toRelease, null, 2)}\n\n` +
            `Original error: ${message}`,
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
  const packagesToCheck = packages.filter((p): p is [string, string] =>
    Boolean(p[1]),
  );

  const checks = await Promise.allSettled(
    packagesToCheck.map(([name, version]) =>
      exec('npm', ['view', `${name}@${version}`, 'version'], {
        cwd: process.cwd(),
      }),
    ),
  );

  const missing = packagesToCheck
    .filter((_, i) => checks[i]?.status === 'rejected')
    .map(([name, version]) => `${name}@${version}`);

  return {published: missing.length === 0, missing};
}

async function getRepoRoot(): Promise<string | null> {
  try {
    const {stdout} = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      {cwd: process.cwd()},
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

async function findCommitByTag(
  version: string,
  repoRoot: string,
): Promise<string | null> {
  let tags: string[];
  try {
    const {stdout} = await execFileAsync('git', ['tag', '-l', `*${version}*`], {
      cwd: repoRoot,
    });
    tags = stdout.trim().split('\n').filter(Boolean).slice(0, 10);
  } catch {
    /* git unavailable or unexpected failure — no tags to search */
    return null;
  }

  for (const tag of tags) {
    try {
      const {stdout: tagCommit} = await execFileAsync(
        'git',
        ['rev-list', '-n', '1', tag],
        {cwd: repoRoot},
      );
      const commit = tagCommit.trim();

      if (await isMatchingSkeletonCommit({repoRoot, commit, version})) {
        return commit;
      }
    } catch {
      /* Expected: tag might not point to a commit with matching skeleton */
    }
  }

  return null;
}

async function findCommitByReleaseMessage(
  version: string,
  repoRoot: string,
): Promise<string | null> {
  const releasePatterns = [
    `\\[ci\\] release.*${version.replace(/\./g, '\\.')}`,
    `\\[ci\\] release.*${version.replace(/\./g, '-')}`,
    `release.*${version}`,
  ];

  for (const pattern of releasePatterns) {
    let commits: string[];
    try {
      const {stdout} = await execFileAsync(
        'git',
        ['log', '--format=%H', `--grep=${pattern}`, '--all'],
        {cwd: repoRoot},
      );
      commits = stdout.trim().split('\n').filter(Boolean).slice(0, 10);
    } catch {
      /* git unavailable or unexpected failure — try next pattern */
      continue;
    }

    for (const commit of commits) {
      if (await isMatchingSkeletonCommit({repoRoot, commit, version})) {
        return commit;
      }
    }
  }

  return null;
}

async function findCommitByPackageJsonHistory(
  version: string,
  repoRoot: string,
): Promise<string | null> {
  let allCommits: string[];
  try {
    const {stdout} = await execFileAsync(
      'git',
      ['log', '--format=%H', '--all', '--', 'templates/skeleton/package.json'],
      {cwd: repoRoot},
    );
    allCommits = stdout.trim().split('\n').filter(Boolean).slice(0, 200);
  } catch {
    /* git unavailable or unexpected failure */
    return null;
  }

  for (const commit of allCommits) {
    try {
      const {stdout: packageContent} = await execFileAsync(
        'git',
        ['show', `${commit}:templates/skeleton/package.json`],
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
      /* Expected: commit might not have valid package.json */
    }
  }

  return null;
}

async function findCommitForVersion(version: string): Promise<string | null> {
  try {
    const repoRoot = await getRepoRoot();
    if (!repoRoot) {
      return null;
    }

    return (
      (await findCommitByTag(version, repoRoot)) ||
      (await findCommitByReleaseMessage(version, repoRoot)) ||
      (await findCommitByPackageJsonHistory(version, repoRoot))
    );
  } catch {
    /* Expected: any git operation might fail in unusual environments */
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

// Resolve a single release to a verified git commit, or return null if unavailable.
// Validates the changelog hash exists in git before returning it; falls through to
// a git-log search if the hash is absent, a non-commit object, or unreachable.
async function resolveReleaseCommit(
  release: {hash?: string | null; version: string},
  repoRoot: string,
): Promise<string | null> {
  if (release.hash) {
    try {
      await exec('git', ['cat-file', '-e', release.hash], {cwd: repoRoot});
      return release.hash;
    } catch {
      return findCommitForVersionCached(release.version);
    }
  }
  return findCommitForVersionCached(release.version);
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
    const {stdout: packageContent} = await execFileAsync(
      'git',
      ['show', `${commit}:templates/skeleton/package.json`],
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

async function resolveSkeletonCommit(
  version: string,
  changelog: ChangeLog,
): Promise<{commit: string; skeletonVersion: string}> {
  const repoRoot = await getRepoRoot();
  if (!repoRoot) {
    throw new Error(
      `Could not find git repository root. Ensure tests run from within the Hydrogen monorepo.`,
    );
  }
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

  if (!commit) {
    const versionIndex = changelog.releases.findIndex(
      (r) => r.version === version,
    );
    const originalMajor = getMajorVersion(version);

    for (
      let i = versionIndex + 1;
      i < changelog.releases.length && !commit;
      i++
    ) {
      const candidateRelease = changelog.releases[i];
      if (!candidateRelease) continue;
      // Stop when we cross a major-train boundary — scaffolding from a different
      // year would compromise test fidelity without making it obvious.
      if (getMajorVersion(candidateRelease.version) !== originalMajor) break;

      const candidateCommit = await resolveReleaseCommit(
        candidateRelease,
        repoRoot,
      );
      if (candidateCommit) {
        commit = candidateCommit;
        skeletonVersion = candidateRelease.version;
        console.warn(
          `⚠️  Could not find exact skeleton commit for ${version}. ` +
            `Falling back to ${candidateRelease.version} skeleton — test fidelity may be reduced.`,
        );
      }
    }

    if (!commit) {
      throw new ScaffoldNotFoundError(
        `Could not find git commit for version ${version} or any previous version.\n` +
          `This version likely never had a skeleton template release.`,
      );
    }
  }

  return {commit, skeletonVersion};
}

async function extractSkeletonTemplate(
  tempDir: string,
  commit: string,
  skeletonVersion: string,
): Promise<string> {
  const repoRoot = await getRepoRoot();
  if (!repoRoot) {
    throw new Error(
      `Could not find git repository root for scaffolding. Ensure tests run from within the Hydrogen monorepo.`,
    );
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
      {cwd: repoRoot},
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to extract skeleton template from commit ${commit} (version ${skeletonVersion}).\n` +
        `This might indicate the commit doesn't exist or templates/skeleton path doesn't exist in that commit.\n` +
        `Original error: ${message}`,
    );
  } finally {
    await unlink(archivePath).catch(() => {
      /* Expected: archive file might already be deleted */
    });
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

  return skeletonPath;
}

async function initializeTestProject(projectDir: string): Promise<void> {
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
}

async function scaffoldProjectAtVersion(
  tempDir: string,
  version: string,
  changelog: ChangeLog,
): Promise<{projectDir: string; skeletonVersion: string}> {
  const projectDir = join(tempDir, 'test-project');

  const {commit, skeletonVersion} = await resolveSkeletonCommit(
    version,
    changelog,
  );

  const skeletonPath = await extractSkeletonTemplate(
    tempDir,
    commit,
    skeletonVersion,
  );

  await rename(skeletonPath, projectDir);
  await initializeTestProject(projectDir);

  return {projectDir, skeletonVersion};
}
