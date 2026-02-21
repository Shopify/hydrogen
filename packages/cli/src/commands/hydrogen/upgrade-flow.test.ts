import {describe, it, expect, vi} from 'vitest';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exec} from '@shopify/cli-kit/node/system';
import {execAsync} from '../../lib/process.js';
import * as upgradeModule from './upgrade.js';

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
    } catch (error) {
      missing.push(`${packageName}@${version}`);
    }
  }

  return {
    published: missing.length === 0,
    missing,
  };
}

describe('upgrade flow', () => {
  it('validates changelog.json structure', async () => {
    const changelog = await upgradeModule.getChangelog();

    expect(changelog).toBeDefined();
    expect(changelog.releases).toBeDefined();
    expect(Array.isArray(changelog.releases)).toBe(true);
    expect(changelog.releases.length).toBeGreaterThan(0);

    const latestRelease = changelog.releases[0];
    if (!latestRelease) {
      throw new Error('No releases found in changelog');
    }

    expect(latestRelease.version).toBeDefined();
    expect(latestRelease.version).toMatch(/^\d{4}\.\d+\.\d+$/);
    expect(latestRelease.dependencies).toBeDefined();
    expect(latestRelease.devDependencies).toBeDefined();
    expect(Array.isArray(latestRelease.features)).toBe(true);
    expect(Array.isArray(latestRelease.fixes)).toBe(true);

    for (const [, version] of Object.entries(latestRelease.dependencies)) {
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    }

    for (const [, version] of Object.entries(latestRelease.devDependencies)) {
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    }
  });

  it('upgrades from previous version to latest', async () => {
    const changelog = await upgradeModule.getChangelog();
    const latestRelease = changelog.releases[0];
    const previousRelease = changelog.releases[1];

    if (!latestRelease || !previousRelease) {
      throw new Error('Need at least 2 releases in changelog for testing');
    }

    const fromVersion = previousRelease.version;
    const toVersion = latestRelease.version;

    console.log(`Testing upgrade: ${fromVersion} → ${toVersion}`);

    const packagesToCheck: Array<[string, string | undefined]> = [
      ['@shopify/hydrogen', latestRelease.dependencies?.['@shopify/hydrogen']],
      [
        '@shopify/hydrogen',
        previousRelease.dependencies?.['@shopify/hydrogen'],
      ],
    ];

    if (latestRelease.devDependencies?.['@shopify/mini-oxygen']) {
      packagesToCheck.push([
        '@shopify/mini-oxygen',
        latestRelease.devDependencies['@shopify/mini-oxygen'],
      ]);
    }

    const {published, missing} = await arePackagesPublished(packagesToCheck);

    if (!published) {
      console.log(
        `⏭️  Skipping test: Required packages not yet published to npm:`,
      );
      console.log(`   Missing: ${missing.join(', ')}`);
      console.log(
        `   This is expected if changelog.json was updated before the Version PR was merged.`,
      );
      return;
    }

    const projectDir = await scaffoldHistoricalProject(fromVersion);

    const initialPackageJson = JSON.parse(
      await readFile(join(projectDir, 'package.json'), 'utf8'),
    );
    const initialHydrogenVersion =
      initialPackageJson.dependencies?.['@shopify/hydrogen'];

    expect(
      initialHydrogenVersion === fromVersion ||
        initialHydrogenVersion === `^${fromVersion}`,
    ).toBe(true);

    process.env.FORCE_CHANGELOG_SOURCE = 'local';
    process.env.SHOPIFY_HYDROGEN_FLAG_FORCE = '1';
    process.env.CI = '1';

    await upgradeModule.runUpgrade({
      appPath: projectDir,
      version: toVersion,
      force: true,
    });

    const upgradedPackageJson = JSON.parse(
      await readFile(join(projectDir, 'package.json'), 'utf8'),
    );
    const upgradedHydrogenVersion =
      upgradedPackageJson.dependencies?.['@shopify/hydrogen'];

    expect(
      upgradedHydrogenVersion === toVersion ||
        upgradedHydrogenVersion === `^${toVersion}`,
    ).toBe(true);

    for (const [dep, expectedVersion] of Object.entries(
      latestRelease.dependencies,
    )) {
      const actualVersion = upgradedPackageJson.dependencies?.[dep];
      expect(
        actualVersion,
        `dependency ${dep} should be present after upgrade`,
      ).toBeDefined();
      expect(
        actualVersion === expectedVersion ||
          actualVersion === `^${expectedVersion}` ||
          actualVersion === `~${expectedVersion}` ||
          actualVersion.includes(String(expectedVersion)),
        `dependency ${dep} version mismatch: expected ${expectedVersion}, got ${actualVersion}`,
      ).toBe(true);
    }

    for (const [dep, expectedVersion] of Object.entries(
      latestRelease.devDependencies,
    )) {
      const actualVersion = upgradedPackageJson.devDependencies?.[dep];
      expect(
        actualVersion,
        `devDependency ${dep} should be present after upgrade`,
      ).toBeDefined();
      expect(
        actualVersion === expectedVersion ||
          actualVersion === `^${expectedVersion}` ||
          actualVersion === `~${expectedVersion}` ||
          actualVersion.includes(String(expectedVersion)),
        `devDependency ${dep} version mismatch: expected ${expectedVersion}, got ${actualVersion}`,
      ).toBe(true);
    }

    if (latestRelease.removeDependencies) {
      for (const dep of latestRelease.removeDependencies) {
        const isReinstalled =
          dep in latestRelease.dependencies ||
          dep in latestRelease.devDependencies;

        if (!isReinstalled) {
          expect(upgradedPackageJson.dependencies?.[dep]).toBeUndefined();
          expect(upgradedPackageJson.devDependencies?.[dep]).toBeUndefined();
        }
      }
    }

    if (latestRelease.removeDevDependencies) {
      for (const dep of latestRelease.removeDevDependencies) {
        const isReinstalled =
          dep in latestRelease.dependencies ||
          dep in latestRelease.devDependencies;

        if (!isReinstalled) {
          expect(upgradedPackageJson.dependencies?.[dep]).toBeUndefined();
          expect(upgradedPackageJson.devDependencies?.[dep]).toBeUndefined();
        }
      }
    }

    const hasUpgradeSteps =
      latestRelease.features?.some((f) => f.steps && f.steps.length > 0) ||
      latestRelease.fixes?.some((f) => f.steps && f.steps.length > 0);

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

    await exec('npm', ['install'], {cwd: projectDir});

    if (!hasUpgradeSteps) {
      await exec('npm', ['run', 'build'], {
        cwd: projectDir,
        env: {...process.env, NODE_ENV: 'production'},
      });
    }
  }, 180000);
});

async function scaffoldHistoricalProject(version: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'hydrogen-upgrade-test-'));
  const projectDir = join(tempDir, 'test-project');

  const repoRoot = join(process.cwd(), '../../');
  const skeletonPath = join(repoRoot, 'templates/skeleton');

  await execAsync(`cp -r ${skeletonPath} ${projectDir}`);

  const packageJsonPath = join(projectDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  packageJson.version = version;
  packageJson.dependencies['@shopify/hydrogen'] = version;

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

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

  return projectDir;
}
