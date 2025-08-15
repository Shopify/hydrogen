import {createRequire} from 'node:module';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  inTemporaryDirectory,
  writeFile,
  fileExists,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {
  renderSelectPrompt,
  renderConfirmationPrompt,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {type PackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {exec} from '@shopify/cli-kit/node/system';
import {
  buildUpgradeCommandArgs,
  displayConfirmation,
  getAbsoluteVersion,
  getAvailableUpgrades,
  getCummulativeRelease,
  getHydrogenVersion,
  getSelectedRelease,
  runUpgrade,
  type CumulativeRelease,
  type Release,
  upgradeNodeModules,
  getChangelog,
  displayDevUpgradeNotice,
} from './upgrade.js';
import {getSkeletonSourceDir} from '../../lib/build.js';

// Test version numbers used to avoid conflicts with duplicate changelog versions
const TEST_VERSION_DEPENDENCY_UPGRADE = '9999.99.99';
const TEST_VERSION_DEV_DEPENDENCY_UPGRADE = '9999.99.98';

vi.mock('@shopify/cli-kit/node/session');

vi.mock('../../lib/shell.js', () => ({getCliCommand: vi.fn(() => 'h2')}));

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderTasks: vi.fn(() => Promise.resolve()),
    renderSelectPrompt: vi.fn(() => Promise.resolve()),
    renderConfirmationPrompt: vi.fn(() => Promise.resolve(false)),
  };
});

const outputMock = mockAndCaptureOutput();

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.clearAllMocks();
  outputMock.clear();
});

async function createOutdatedSkeletonPackageJson() {
  const require = createRequire(import.meta.url);
  const packageJson: PackageJson = require(
    joinPath(getSkeletonSourceDir(), 'package.json'),
  );

  if (!packageJson) throw new Error('Could not parse package.json');
  if (!packageJson?.dependencies)
    throw new Error('Could not parse package.json dependencies');
  if (!packageJson?.devDependencies)
    throw new Error('Could not parse package.json devDependencies');

  // bump the versions to be outdated
  packageJson.dependencies['@shopify/hydrogen'] = '^2023.1.6';
  packageJson.dependencies['@remix-run/react'] = '1.12.0';
  packageJson.devDependencies['@shopify/cli-hydrogen'] = '^4.0.8';
  packageJson.devDependencies['@shopify/remix-oxygen'] = '^1.0.3';
  packageJson.devDependencies['@remix-run/dev'] = '1.12.0';
  packageJson.devDependencies['typescript'] = '^4.9.5';

  return packageJson;
}

async function createOutdatedSkeletonPackageJsonWithReactRouter() {
  const require = createRequire(import.meta.url);
  const packageJson: PackageJson = require(
    joinPath(getSkeletonSourceDir(), 'package.json'),
  );

  if (!packageJson) throw new Error('Could not parse package.json');
  if (!packageJson?.dependencies)
    throw new Error('Could not parse package.json dependencies');
  if (!packageJson?.devDependencies)
    throw new Error('Could not parse package.json devDependencies');

  // bump the versions to be outdated
  packageJson.dependencies['@shopify/hydrogen'] = '^2023.1.6';
  packageJson.dependencies['react-router'] = '7.0.0';
  packageJson.dependencies['react-router-dom'] = '7.0.0';
  packageJson.devDependencies['@shopify/cli-hydrogen'] = '^4.0.8';
  packageJson.devDependencies['@shopify/remix-oxygen'] = '^1.0.3';
  packageJson.devDependencies['@react-router/dev'] = '7.0.0';
  packageJson.devDependencies['typescript'] = '^4.9.5';

  return packageJson;
}

const REACT_ROUTER_RELEASE = {
  title: 'React Rotuer 7.5',
  version: '2025.5.0',
  hash: '-',
  commit: 'https://github.com/Shopify/hydrogen/pull/2819',
  pr: 'https://github.com/Shopify/hydrogen/pull/2819',
  dependencies: {
    'react-router': '^7.5.0',
    '@shopify/hydrogen': '2025.5.0',
    '@shopify/remix-oxygen': '^2.0.12',
  },
  devDependencies: {
    '@react-router/dev': '^7.5.0',
    '@shopify/cli': '3.77.1',
    '@shopify/mini-oxygen': '^3.2.0',
    '@shopify/hydrogen-codegen': '^0.3.3',
    '@shopify/oxygen-workers-types': '^4.1.6',
    vite: '^6.2.4',
  },
  dependenciesMeta: {},
  fixes: [],
  features: [],
  date: '2025-04-24',
} satisfies Release;

/**
 * Creates a temporary directory with a git repo and a package.json
 */
async function inTemporaryHydrogenRepo(
  cb: (tmpDir: string) => Promise<void>,
  {
    cleanGitRepo,
    packageJson,
  }: {
    cleanGitRepo?: boolean;
    packageJson?: PackageJson;
  } = {cleanGitRepo: true},
) {
  return inTemporaryDirectory(async (tmpDir) => {
    // init the git repo
    await exec('git', ['init'], {cwd: tmpDir});

    if (packageJson) {
      const packageJsonPath = joinPath(tmpDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(packageJson));
      expect(await fileExists(packageJsonPath)).toBeTruthy();
    }

    // expect to be a git repo
    expect(await fileExists(joinPath(tmpDir, '/.git/config'))).toBeTruthy();

    if (cleanGitRepo) {
      await exec('git', ['add', 'package.json'], {cwd: tmpDir});

      if (process.env.NODE_ENV === 'test' && process.env.CI) {
        await exec('git', ['config', 'user.email', 'test@hydrogen.shop'], {
          cwd: tmpDir,
        });
        await exec('git', ['config', 'user.name', 'Hydrogen Test'], {
          cwd: tmpDir,
        });
      }
      await exec('git', ['commit', '-m', 'initial commit'], {cwd: tmpDir});
    }

    await cb(tmpDir);
  });
}

function increasePatchVersion(depName: string, deps: Record<string, string>) {
  const depVersion = deps[depName];
  if (!depVersion) {
    throw new Error(
      `No dependency "${depName}" found in: ${Object.keys(deps || {})}`,
    );
  }

  return {
    [depName]: depVersion.replace(
      /\.(\d+)$/,
      (_, patchVersion) => `.${Number(patchVersion) + 1}`,
    ),
  };
}

describe('upgrade', async () => {
  // Create an outdated skeleton package.json for all tests
  const OUTDATED_HYDROGEN_PACKAGE_JSON =
    await createOutdatedSkeletonPackageJson();

  const OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER =
    await createOutdatedSkeletonPackageJsonWithReactRouter();

  describe('checkIsGitRepo', () => {
    it('renders an error message when not in a git repo', async () => {
      await inTemporaryDirectory(async (appPath) => {
        await expect(runUpgrade({appPath})).rejects.toThrowError(
          'git repository',
        );
      });
    });
  });

  describe('checkDirtyGitBranch', () => {
    it('renders error message if the target git repo is dirty', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await expect(runUpgrade({appPath})).rejects.toThrowError('clean git');
        },
        {cleanGitRepo: false, packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON},
      );
    });
  });

  describe('getHydrogenVersion', () => {
    it('throws if no package.json is found', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await expect(runUpgrade({appPath})).rejects.toThrowError(
            'valid package.json',
          );
        },
        {packageJson: undefined},
      );
    });

    it('throws if no hydrogen version is found in package.json', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await expect(runUpgrade({appPath})).rejects.toThrowError(
            'version in package.json',
          );
        },
        {
          cleanGitRepo: true,
          packageJson: {
            name: 'some-name',
            dependencies: {},
          },
        },
      );
    });

    it('returns the current hydrogen version from the package.json', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const hydrogen = await getHydrogenVersion({appPath});

          expect(hydrogen).toBeDefined();
          expect(hydrogen.currentVersion).toMatch('^2023.1.6');
          expect(hydrogen.currentDependencies).toMatchObject({
            ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
            ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
          });
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('exists when run over a prerelease "next" version', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await expect(runUpgrade({appPath})).rejects.toThrowError(
            'prerelease',
          );
        },
        {
          cleanGitRepo: true,
          packageJson: {
            dependencies: {
              '@shopify/hydrogen': '0.0.0-next-74ea1db-20231120210149',
            },
          },
        },
      );
    });
  });

  describe('fetchChangelog', () => {
    it('fetches the latest changelog from the hydrogen repo', async () => {
      // Force remote changelog usage by clearing local environment
      const originalForceLocal = process.env.FORCE_CHANGELOG_SOURCE;
      process.env.FORCE_CHANGELOG_SOURCE = 'remote';

      try {
        const changelog = await getChangelog();

        // Verify changelog structure
        expect(changelog).toBeDefined();
        expect(changelog).toHaveProperty('url');
        expect(changelog).toHaveProperty('version');
        expect(changelog).toHaveProperty('releases');

        // Verify URL points to GitHub pulls
        expect(changelog.url).toMatch(/github\.com\/Shopify\/hydrogen/);

        // Verify releases array structure
        expect(Array.isArray(changelog.releases)).toBe(true);
        expect(changelog.releases.length).toBeGreaterThan(0);

        // Verify first release has required fields
        const latestRelease = changelog.releases[0];
        expect(latestRelease).toBeDefined();

        if (!latestRelease) {
          throw new Error('Latest release is undefined');
        }

        expect(latestRelease).toHaveProperty('title');
        expect(latestRelease).toHaveProperty('version');
        expect(latestRelease).toHaveProperty('hash');
        expect(latestRelease).toHaveProperty('commit');
        expect(latestRelease).toHaveProperty('dependencies');
        expect(latestRelease).toHaveProperty('devDependencies');
        expect(latestRelease).toHaveProperty('features');
        expect(latestRelease).toHaveProperty('fixes');

        // Verify version format (YYYY.M.P)
        expect(latestRelease.version).toMatch(/^\d{4}\.\d+\.\d+$/);

        // Verify commit URL format
        expect(latestRelease.commit).toMatch(
          /^https:\/\/github\.com\/Shopify\/hydrogen/,
        );

        // Verify dependencies are objects
        expect(typeof latestRelease.dependencies).toBe('object');
        expect(typeof latestRelease.devDependencies).toBe('object');

        // Verify features and fixes are arrays
        expect(Array.isArray(latestRelease.features)).toBe(true);
        expect(Array.isArray(latestRelease.fixes)).toBe(true);
      } finally {
        // Restore original environment
        if (originalForceLocal !== undefined) {
          process.env.FORCE_CHANGELOG_SOURCE = originalForceLocal;
        } else {
          delete process.env.FORCE_CHANGELOG_SOURCE;
        }
      }
    }, 10000); // 10 second timeout for network call

    it('successfully loads changelog when network is available', async () => {
      // This test validates that the changelog function works as expected
      // Both local and remote sources should provide valid changelog data
      const changelog = await getChangelog();

      // Test core functionality
      expect(changelog.releases).toBeDefined();
      expect(changelog.releases.length).toBeGreaterThan(0);

      // Test that releases have the expected structure
      const sampleRelease = changelog.releases[0];
      expect(sampleRelease).toBeDefined();

      if (!sampleRelease) {
        throw new Error('Sample release is undefined');
      }

      expect(sampleRelease.version).toBeDefined();
      expect(sampleRelease.dependencies).toBeDefined();
      expect(sampleRelease.devDependencies).toBeDefined();

      // Test that the structure matches what upgrade functions expect
      expect(typeof sampleRelease.dependencies).toBe('object');
      expect(typeof sampleRelease.devDependencies).toBe('object');
      expect(Array.isArray(sampleRelease.features)).toBe(true);
      expect(Array.isArray(sampleRelease.fixes)).toBe(true);
    });
  });

  describe('getAvailableUpgrades', async () => {
    it('renders "already in the latest version" success message if no upgrades are available', async () => {
      const {releases} = await getChangelog();

      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await runUpgrade({appPath});
          expect(outputMock.info()).toMatch(
            / success.+ latest Hydrogen version/is,
          );
        },
        {
          cleanGitRepo: true,
          packageJson: {
            dependencies: {
              // @ts-expect-error - we know this release version exists
              '@shopify/hydrogen': releases[0].version,
            },
          },
        },
      );
    });

    it('returns available upgrades and uniqueAvailableUpgrades if they exist', async () => {
      const {releases} = await getChangelog();

      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const current = await getHydrogenVersion({appPath});
          const result = getAvailableUpgrades({
            releases,
            ...current,
          });

          // The getAvailableUpgrades function should:
          // 1. Return all releases newer than the current version
          // 2. Filter out duplicate versions (keeping only the first/newest)
          //
          // To make this test resilient to both duplicate and unique versions,
          // we need to find the first set of unique versions that are newer
          // than what's installed (releases[2].version)

          // Find up to 2 unique versions that are newer than releases[2]
          const newerReleases = [];
          const seenVersions = new Set();

          for (const release of releases) {
            // Stop when we reach the installed version
            if (release.version === releases[2]?.version) break;

            // Only add if we haven't seen this version
            if (!seenVersions.has(release.version)) {
              newerReleases.push(release);
              seenVersions.add(release.version);
              // Stop after finding 2 unique versions
              if (newerReleases.length >= 2) break;
            }
          }

          // Build expected uniqueAvailableUpgrades
          const expectedUniqueUpgrades = newerReleases.reduce(
            (acc, release) => {
              return {
                ...acc,
                [release.version]: release,
              };
            },
            {},
          );

          // Verify the results
          expect(result.availableUpgrades).toHaveLength(newerReleases.length);
          expect(result.availableUpgrades).toEqual(newerReleases);
          expect(result.uniqueAvailableUpgrades).toEqual(
            expectedUniqueUpgrades,
          );
        },
        {
          cleanGitRepo: true,
          packageJson: {
            dependencies: {
              // Install an older version (3rd in the list)
              '@shopify/hydrogen': releases[2]!.version,
            },
          },
        },
      );
    });

    it('it finds outdated dependencies', async () => {
      const {releases} = await getChangelog();
      const latestRelease = releases[0]!;

      expect(
        getAvailableUpgrades({
          currentVersion: latestRelease.version,
          currentDependencies: {},
          releases,
        }).availableUpgrades,
      ).toHaveLength(0);

      const depName = Object.keys(latestRelease.dependencies)[0]!;
      const devDepName = Object.keys(latestRelease.devDependencies)[0]!;

      // Copy of latest release, no changes
      expect(
        getAvailableUpgrades({
          currentVersion: latestRelease.version,
          currentDependencies: {
            [depName]: latestRelease.dependencies[depName]!,
            [devDepName]: latestRelease.devDependencies[devDepName]!,
          },
          releases: [{...latestRelease}, ...releases],
        }).availableUpgrades,
      ).toHaveLength(0);

      // Test with a unique version number to ensure the upgrade is detected
      // This ensures the test works regardless of whether the changelog has duplicates

      // Copy of latest release but with increased patch version of a dependency
      // and a unique version number to avoid duplicate filtering
      const upgradedRelease = {
        ...latestRelease,
        version: TEST_VERSION_DEPENDENCY_UPGRADE,
        dependencies: {
          ...latestRelease.dependencies,
          ...increasePatchVersion(depName, latestRelease.dependencies),
        },
      };

      expect(
        getAvailableUpgrades({
          currentVersion: latestRelease.version,
          currentDependencies: {
            [depName]: latestRelease.dependencies[depName]!,
          },
          releases: [upgradedRelease, ...releases],
        }).availableUpgrades,
      ).toHaveLength(1);

      // Copy of latest release but with increased patch version of a dev-dependency
      // Also use a unique version to avoid duplicate filtering
      const upgradedDevRelease = {
        ...latestRelease,
        version: '9999.99.98', // Different unique version
        devDependencies: {
          ...latestRelease.devDependencies,
          ...increasePatchVersion(devDepName, latestRelease.devDependencies),
        },
      };

      expect(
        getAvailableUpgrades({
          currentVersion: latestRelease.version,
          currentDependencies: {
            [devDepName]: latestRelease.devDependencies[devDepName]!,
          },
          releases: [upgradedDevRelease, ...releases],
        }).availableUpgrades,
      ).toHaveLength(1);
    });
  });

  describe('getSelectedRelease', () => {
    it('prioritizes a passed target --version over a select prompt if available', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const {releases} = await getChangelog();
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            releases,
          });

          await expect(
            getSelectedRelease({
              availableUpgrades,
              // @ts-ignore - we know this release version exists
              currentVersion: current.currentVersion,
              // OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'],
              targetVersion: '2023.7.10',
            }),
          ).resolves.toMatchObject({
            version: '2023.7.10',
          });

          expect(renderSelectPrompt).not.toHaveBeenCalled();
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('prompts if a passed target --version is not a valid upgradable version', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const {releases} = await getChangelog();
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            releases,
          });

          // Choose latest release
          vi.mocked(renderSelectPrompt<Release>).mockImplementationOnce(
            ({choices}) => Promise.resolve(choices[0]?.value!),
          );

          await expect(
            getSelectedRelease({
              availableUpgrades,
              currentVersion: current!.currentVersion!,
              targetVersion: '2023.1.5', // fails because this version is in the past
            }),
          ).resolves.toMatchObject(availableUpgrades[0]!);

          expect(renderSelectPrompt).toHaveBeenCalled();
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('prompts to select a release if no target --version is passed', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const {releases} = await getChangelog();
          const previousRelease = releases[1];
          const latestRelease = releases[0];
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            releases,
          });

          // Choose latest release
          vi.mocked(renderSelectPrompt<Release>).mockImplementationOnce(
            ({choices}) => Promise.resolve(choices[0]?.value!),
          );

          await expect(
            getSelectedRelease({
              availableUpgrades,
              currentVersion: previousRelease!.version,
            }),
          ).resolves.toMatchObject(availableUpgrades[0]!);

          expect(renderSelectPrompt).toHaveBeenCalledWith({
            message: expect.stringContaining(previousRelease!.version),
            choices: expect.arrayContaining([
              {
                label: expect.stringContaining(latestRelease!.version),
                value: latestRelease,
              },
            ]),
            defaultValue: latestRelease,
          });
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });
  });

  describe('getCummulativeRelease', () => {
    it('returns the correct fixes and features for a release range thats outdated', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const {releases} = await getChangelog();
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            releases,
          });

          // 2023.4.1
          const selectedRelease = releases.find(
            (release) => release.version === '2023.4.1',
          );

          // testing from 2023.1.6 (outdated) to 2023.4.1
          const {features, fixes} = getCummulativeRelease({
            availableUpgrades,
            ...current,
            // @ts-ignore - we know this release version exists
            selectedRelease,
          });

          expect(features).toMatchObject(CUMMLATIVE_RELEASE.features);
          expect(fixes).toMatchObject(CUMMLATIVE_RELEASE.fixes);
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });
  });

  describe('displayConfirmation', () => {
    it('renders a confirmation prompt to continue or return to the previous menu', async () => {
      await inTemporaryHydrogenRepo(
        async () => {
          const {releases} = await getChangelog();

          // 2023.10.0
          const selectedRelease = releases.find(
            (release) => release.version === '2023.10.0',
          ) as (typeof releases)[0];

          await expect(
            displayConfirmation({
              cumulativeRelease: CUMMLATIVE_RELEASE,
              selectedRelease,
            }),
          ).resolves.toEqual(false);

          const info = outputMock.info();
          expect(info).toMatch('Included in this upgrade');

          [...CUMMLATIVE_RELEASE.features, ...CUMMLATIVE_RELEASE.fixes].forEach(
            (feat) =>
              // Cut the string to avoid matching the banner
              expect(info).toMatch(feat.title.slice(0, 15)),
          );

          expect(renderConfirmationPrompt).toHaveBeenCalledWith({
            message: `Are you sure you want to upgrade to ${selectedRelease.version}?`,
            cancellationMessage: `No, choose another version`,
            defaultValue: true,
          });
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });
  });

  describe('displayDevUpgradeNotice', () => {
    it('shows up a notice if Hydrogen is outdated', async () => {
      await inTemporaryHydrogenRepo(
        async (targetPath) => {
          await expect(
            displayDevUpgradeNotice({targetPath}),
          ).resolves.not.toThrow();

          expect(outputMock.info()).toMatch(
            /new @shopify\/hydrogen versions? available/i,
          );
          expect(outputMock.info()).toMatch(
            /Current: [\d.] | Latest: [\d.]+\s{2,}/i,
          );
          expect(outputMock.info()).toMatch(
            /The next \d+ version\(s\) include/i,
          );
          expect(outputMock.info()).toMatch('Run `h2 upgrade`');
        },
        {cleanGitRepo: false, packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON},
      );
    });

    it('shows up a notice if there are related dependencies to upgrade', async () => {
      const latestHydrogenVersion = (await (
        await getChangelog()
      ).releases[0]?.version) as string;

      await inTemporaryHydrogenRepo(
        async (targetPath) => {
          await expect(
            displayDevUpgradeNotice({targetPath}),
          ).resolves.not.toThrow();

          expect(outputMock.info()).toMatch(
            /new @shopify\/hydrogen versions? available/i,
          );
          expect(outputMock.info()).toMatch(
            /Current: [\d.] | Latest: [\d.]+ with updated dependencies\s{1,}/i,
          );
          expect(outputMock.info()).toMatch(/The next 1 version\(s\) include/i);
          expect(outputMock.info()).toMatch(
            `or \`h2 upgrade --version ${latestHydrogenVersion}\``,
          );
        },
        {
          cleanGitRepo: false,
          packageJson: {
            ...OUTDATED_HYDROGEN_PACKAGE_JSON,
            dependencies: {
              ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
              '@shopify/hydrogen': latestHydrogenVersion,
            },
          },
        },
      );
    });
  });

  describe('upgradeNodeModules', () => {
    it('runs the upgrade command task', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const {releases} = await getChangelog();

          const selectedRelease = releases.find(
            (release) => release.version === '2023.10.0',
          ) as (typeof releases)[0];

          const currentDependencies = {
            ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
            ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
          };

          await upgradeNodeModules({
            appPath,
            selectedRelease,
            currentDependencies,
          });

          expect(renderTasks).toHaveBeenCalled();
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('builds the upgrade command args', async () => {
      const {releases} = await getChangelog();

      const selectedRelease = releases.find(
        (release) => release.version === '2023.10.0',
      ) as (typeof releases)[0];

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
      };

      const result: string[] = [
        '@shopify/hydrogen@2023.10.0',
        '@shopify/cli-hydrogen@6.0.0',
        '@shopify/remix-oxygen@2.0.0',
        '@remix-run/react@2.1.0',
        '@remix-run/dev@2.1.0',
        'typescript@5.2.2',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(expect.arrayContaining(result));
    });

    it('upgrades and syncs up all available React Router deps if they are out-of-date', async () => {
      const selectedRelease = REACT_ROUTER_RELEASE;

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER.dependencies,
        'react-router': '7.0.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER.devDependencies,
        '@react-router/dev': '7.0.0',
      };

      const result: string[] = [
        '@shopify/hydrogen@2025.5.0',
        '@shopify/remix-oxygen@2.0.12',
        '@shopify/cli@3.77.1',
        '@shopify/mini-oxygen@3.2.0',
        '@shopify/hydrogen-codegen@0.3.3',
        '@shopify/oxygen-workers-types@4.1.6',
        'vite@6.2.4',
        'react-router@7.5.0',
        'react-router-dom@7.5.0',
        '@react-router/dev@7.5.0',
        '@react-router/fs-routes@7.5.0',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(result);
    });

    it('upgrades all available React Router deps if they are out-of-date', async () => {
      const selectedRelease = REACT_ROUTER_RELEASE;

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER.dependencies,
        'react-router': '7.3.0',
        'react-router-dom': '7.3.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER.devDependencies,
        '@react-router/dev': '7.3.0',
      };

      const result: string[] = [
        '@shopify/hydrogen@2025.5.0',
        '@shopify/remix-oxygen@2.0.12',
        '@shopify/cli@3.77.1',
        '@shopify/mini-oxygen@3.2.0',
        '@shopify/hydrogen-codegen@0.3.3',
        '@shopify/oxygen-workers-types@4.1.6',
        'vite@6.2.4',
        'react-router@7.5.0',
        'react-router-dom@7.5.0',
        '@react-router/dev@7.5.0',
        '@react-router/fs-routes@7.5.0',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(result);
    });

    it('does not upgrade React Router deps if they are more up-to-date', async () => {
      const selectedRelease = REACT_ROUTER_RELEASE;
      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER.dependencies,
        'react-router': '7.6.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON_WITH_REACT_ROUTER.devDependencies,
        'react-router-dom': '7.6.0',
      };

      const result: string[] = [
        '@shopify/hydrogen@2025.5.0',
        '@shopify/remix-oxygen@2.0.12',
        '@shopify/cli@3.77.1',
        '@shopify/mini-oxygen@3.2.0',
        '@shopify/hydrogen-codegen@0.3.3',
        '@shopify/oxygen-workers-types@4.1.6',
        'vite@6.2.4',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(result);
    });

    it('installs all React Router packages even if only a subset exists', async () => {
      const selectedRelease = REACT_ROUTER_RELEASE;

      // Project has only react-router but missing other packages
      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        'react-router': '7.0.0',
        // Missing: react-router-dom, @react-router/dev, @react-router/fs-routes
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
      };

      const result: string[] = [
        '@shopify/hydrogen@2025.5.0',
        '@shopify/remix-oxygen@2.0.12',
        '@shopify/cli@3.77.1',
        '@shopify/mini-oxygen@3.2.0',
        '@shopify/hydrogen-codegen@0.3.3',
        '@shopify/oxygen-workers-types@4.1.6',
        'vite@6.2.4',
        'react-router@7.5.0',
        'react-router-dom@7.5.0',
        '@react-router/dev@7.5.0',
        '@react-router/fs-routes@7.5.0',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      // Should install ALL React Router packages, not just upgrade the existing one
      expect(args).toEqual(result);
    });

    it('does not install an optional dependency that was not installed', async () => {
      const {releases} = await getChangelog();

      const selectedRelease = Object.create(
        // @ts-ignore - we know this release version exists
        releases.find((release) => release.version === '2023.10.0'),
      ) as (typeof releases)[0];

      // simulate a missing optional dependency
      selectedRelease.dependenciesMeta = {
        typescript: {
          required: false,
        },
      };

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        '@remix-run/react': '2.1.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
        '@remix-run/dev': '2.1.0',
        // simulate a missing required dependency
        typescript: '',
      };

      const result: string[] = [
        '@shopify/cli-hydrogen@6.0.0',
        '@shopify/hydrogen@2023.10.0',
        '@shopify/remix-oxygen@2.0.0',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(result);
    });

    it('adds a required dependency that was not installed', async () => {
      const {releases} = await getChangelog();

      // has typescript as a required dependency
      const selectedRelease = releases.find(
        (release) => release.version === '2023.10.0',
      ) as (typeof releases)[0];

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        '@remix-run/react': '2.1.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
        '@remix-run/dev': '2.1.0',
        // simulate a missing required dependency
        typescript: '',
      };

      const result: string[] = [
        '@shopify/cli-hydrogen@6.0.0',
        '@shopify/hydrogen@2023.10.0',
        '@shopify/remix-oxygen@2.0.0',
        `typescript@${getAbsoluteVersion(
          // @ts-ignore - we know this release version exists
          selectedRelease.devDependencies.typescript,
        )}`,
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(expect.arrayContaining(result));
    });

    it('does not upgrade a required dependency that is further up-to-date', async () => {
      const {releases} = await getChangelog();

      const selectedRelease = releases.find(
        (release) => release.version === '2023.10.0',
      ) as (typeof releases)[0];

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        '@remix-run/react': '2.1.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
        '@remix-run/dev': '2.1.0',
        typescript: '5.3.0', // more up-to-date than that of 2023.10.0
      };

      const result: string[] = [
        '@shopify/cli-hydrogen@6.0.0',
        '@shopify/hydrogen@2023.10.0',
        '@shopify/remix-oxygen@2.0.0',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(expect.arrayContaining(result));
    });

    it('does not upgrade @next dependencies', async () => {
      const {releases} = await getChangelog();

      const selectedRelease = releases.find(
        (release) => release.version === '2023.10.0',
      ) as (typeof releases)[0];

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        '@remix-run/react': '2.1.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
        '@remix-run/dev': '2.1.0',
        '@shopify/hydrogen': 'next',
      };

      const result: string[] = [
        '@shopify/cli-hydrogen@6.0.0',
        '@shopify/remix-oxygen@2.0.0',
        `typescript@${getAbsoluteVersion(
          // @ts-ignore - we know this release version exists
          selectedRelease.devDependencies.typescript,
        )}`,
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(result);
    });
  });
});

// cummlative result when upgrading from 2023.1.6 (outdated) to 2023.4.1
const CUMMLATIVE_RELEASE = {
  fixes: [
    {
      title: 'Add a default Powered-By: Shopify-Hydrogen header',
      pr: 'https://github.com/Shopify/hydrogen/pull/872',
      id: '872',
      steps: [
        {
          title:
            ' It can be disabled by passing poweredByHeader: false in the configuration object of createRequestHandler',
          code: 'YGBgdHMKaW1wb3J0IHtjcmVhdGVSZXF1ZXN0SGFuZGxlcn0gZnJvbSAnQHNob3BpZnkvcmVtaXgtb3h5Z2VuJzsKCmV4cG9ydCBkZWZhdWx0IHsKICBhc3luYyBmZXRjaChyZXF1ZXN0KSB7CiAgICAvLyAuLi4KICAgIGNvbnN0IGhhbmRsZVJlcXVlc3QgPSBjcmVhdGVSZXF1ZXN0SGFuZGxlcih7CiAgICAgIC8vIC4uLiBvdGhlciBwcm9wZXJ0aWVzIGluY2x1ZGVkCiAgICAgIHBvd2VyZWRCeUhlYWRlcjogZmFsc2UsCiAgICB9KTsKICAgIC8vIC4uLgogIH0sCn07CmBgYA',
          file: 'server.ts',
        },
      ],
    },
    {
      title: 'Updated CLI prompts',
      pr: 'https://github.com/Shopify/hydrogen/pull/733',
      id: '733',
      steps: [
        {
          title: 'Update package.json',
          code: 'YGBgZGlmZgoiZGVwZW5kZW5jaWVzIjogewotICAiQHNob3BpZnkvY2xpIjogIjMueC54IiwKKyAgIkBzaG9waWZ5L2NsaSI6ICIzLjQ1LjAiLAp9CmBgYA==',
          file: 'package.json',
        },
      ],
    },
    {
      title:
        'Added support for the Remix future flags v2_meta, v2_errorBoundary and v2_routeConvention to the generate command',
      pr: 'https://github.com/Shopify/hydrogen/pull/756',
      id: '756',
    },
    {
      title: 'Update virtual route to use Remix V2 route name conventions',
      pr: 'https://github.com/Shopify/hydrogen/pull/792',
      id: '792',
    },
    {
      title: 'Update internal Remix dependencies to 1.15.0',
      pr: 'https://github.com/Shopify/hydrogen/pull/728',
      id: '728',
      docs: 'https://github.com/remix-run/remix/releases/tag/remix%401.15.0',
    },
    {
      title: 'Improve type safety in SEO data generators',
      pr: 'https://github.com/Shopify/hydrogen/pull/763',
      id: '763',
    },
    {
      title: 'Stop hydrating with requestIdleCallback',
      pr: 'https://github.com/Shopify/hydrogen/pull/667',
      id: '667',
    },
    {
      title: 'Fix active cart session event in Live View',
      pr: 'https://github.com/Shopify/hydrogen/pull/614',
      id: '614',
      steps: [
        {
          title:
            'Introducing getStorefrontHeaders that collects the required Shopify headers for making a Storefront API call.',
          code: 'YGBgdHMKKyBpbXBvcnQge2dldFN0b3JlZnJvbnRIZWFkZXJzfSBmcm9tICdAc2hvcGlmeS9yZW1peC1veHlnZW4nOwppbXBvcnQge2NyZWF0ZVN0b3JlZnJvbnRDbGllbnQsIHN0b3JlZnJvbnRSZWRpcmVjdH0gZnJvbSAnQHNob3BpZnkvaHlkcm9nZW4nOwoKZXhwb3J0IGRlZmF1bHQgewogIGFzeW5jIGZldGNoKAogICAgcmVxdWVzdDogUmVxdWVzdCwKICAgIGVudjogRW52LAogICAgZXhlY3V0aW9uQ29udGV4dDogRXhlY3V0aW9uQ29udGV4dCwKICApOiBQcm9taXNlPFJlc3BvbnNlPiB7CgogICAgY29uc3Qge3N0b3JlZnJvbnR9ID0gY3JlYXRlU3RvcmVmcm9udENsaWVudCh7CiAgICAgIGNhY2hlLAogICAgICB3YWl0VW50aWwsCi0gICAgIGJ1eWVySXA6IGdldEJ1eWVySXAocmVxdWVzdCksCiAgICAgIGkxOG46IHtsYW5ndWFnZTogJ0VOJywgY291bnRyeTogJ1VTJ30sCiAgICAgIHB1YmxpY1N0b3JlZnJvbnRUb2tlbjogZW52LlBVQkxJQ19TVE9SRUZST05UX0FQSV9UT0tFTiwKICAgICAgcHJpdmF0ZVN0b3JlZnJvbnRUb2tlbjogZW52LlBSSVZBVEVfU1RPUkVGUk9OVF9BUElfVE9LRU4sCiAgICAgIHN0b3JlRG9tYWluOiBgaHR0cHM6Ly8ke2Vudi5QVUJMSUNfU1RPUkVfRE9NQUlOfWAsCiAgICAgIHN0b3JlZnJvbnRBcGlWZXJzaW9uOiBlbnYuUFVCTElDX1NUT1JFRlJPTlRfQVBJX1ZFUlNJT04gfHwgJzIwMjMtMDEnLAogICAgICBzdG9yZWZyb250SWQ6IGVudi5QVUJMSUNfU1RPUkVGUk9OVF9JRCwKLSAgICAgcmVxdWVzdEdyb3VwSWQ6IHJlcXVlc3QuaGVhZGVycy5nZXQoJ3JlcXVlc3QtaWQnKSwKKyAgICAgc3RvcmVmcm9udEhlYWRlcnM6IGdldFN0b3JlZnJvbnRIZWFkZXJzKHJlcXVlc3QpLAogICAgfSk7CmBgYA==',
          file: 'server.ts',
        },
      ],
    },
  ],
  features: [
    {
      title:
        'Add command to pull environment variables from a Hydrogen storefront',
      pr: 'https://github.com/Shopify/hydrogen/pull/809',
      id: '809',
    },
    {
      title:
        'New --debug flag for the dev command that attaches a Node inspector to the development server',
      pr: 'https://github.com/Shopify/hydrogen/pull/869',
      id: '869',
    },
    {
      title:
        'Add new commands for merchants to be able to list and link Hydrogen storefronts',
      pr: 'https://github.com/Shopify/hydrogen/pull/784',
      id: '784',
    },
    {
      title: 'Added parseGid() utility',
      pr: 'https://github.com/Shopify/hydrogen/pull/845',
      id: '845',
      steps: [
        {
          title: 'Example usage',
          code: 'YGBgdHMKaW1wb3J0IHtwYXJzZUdpZH0gZnJvbSAnQHNob3BpZnkvaHlkcm9nZW4tcmVhY3QnOwoKY29uc3Qge2lkLCByZXNvdXJjZX0gPSBwYXJzZUdpZCgnZ2lkOi8vc2hvcGlmeS9PcmRlci8xMjMnKTsKCmNvbnNvbGUubG9nKGlkKTsgLy8gMTIzCmNvbnNvbGUubG9nKHJlc291cmNlKTsgLy8gT3JkZXIKYGBg',
        },
      ],
    },
    {
      title:
        'Added a new shortcut command that creates a global h2 alias for the Hydrogen CLI',
      pr: 'https://github.com/Shopify/hydrogen/pull/679',
      id: '679',
      steps: [
        {
          title: 'Create the h2 alias',
          code: 'YGBgYmFzaApucHggc2hvcGlmeSBoeWRyb2dlbiBzaG9ydGN1dApgYGA=',
        },
        {
          title: 'After that, you can run commands using the new alias:',
          code: 'YGBgYmFzaApoMiBnZW5lcmF0ZSByb3V0ZSBob21lCmgyIGcgciBob21lICMgU2FtZSBhcyB0aGUgYWJvdmUKaDIgY2hlY2sgcm91dGVzCmBgYA==',
        },
      ],
    },
    {
      title: 'Add an experimental createWithCache_unstable',
      info: 'This utility creates a function similar to useQuery from Hydrogen v1. Use this utility to query third-party APIs and apply custom cache options',
      pr: 'https://github.com/Shopify/hydrogen/pull/600',
      id: '600',
      steps: [
        {
          title: 'To setup the utility, update your server.ts',
          file: 'server.ts',
          code: 'YGBgdHMKaW1wb3J0IHsKICBjcmVhdGVTdG9yZWZyb250Q2xpZW50LAogIGNyZWF0ZVdpdGhDYWNoZV91bnN0YWJsZSwKICBDYWNoZUxvbmcsCn0gZnJvbSAnQHNob3BpZnkvaHlkcm9nZW4nOwoKLy8gLi4uCgogIGNvbnN0IGNhY2hlID0gYXdhaXQgY2FjaGVzLm9wZW4oJ2h5ZHJvZ2VuJyk7CiAgY29uc3Qgd2l0aENhY2hlID0gY3JlYXRlV2l0aENhY2hlX3Vuc3RhYmxlKHtjYWNoZSwgd2FpdFVudGlsfSk7CgogIC8vIENyZWF0ZSBjdXN0b20gdXRpbGl0aWVzIHRvIHF1ZXJ5IHRoaXJkLXBhcnR5IEFQSXM6CiAgY29uc3QgZmV0Y2hNeUNNUyA9IChxdWVyeSkgPT4gewogICAgLy8gUHJlZml4IHRoZSBjYWNoZSBrZXkgYW5kIG1ha2UgaXQgdW5pcXVlIGJhc2VkIG9uIGFyZ3VtZW50cy4KICAgIHJldHVybiB3aXRoQ2FjaGUoWydteS1jbXMnLCBxdWVyeV0sIENhY2hlTG9uZygpLCAoKSA9PiB7CiAgICAgIGNvbnN0IGNtc0RhdGEgPSBhd2FpdCAoYXdhaXQgZmV0Y2goJ215LWNtcy5jb20vYXBpJywgewogICAgICAgIG1ldGhvZDogJ1BPU1QnLAogICAgICAgIGJvZHk6IHF1ZXJ5CiAgICAgIH0pKS5qc29uKCk7CgogICAgICBjb25zdCBuZXh0UGFnZSA9IChhd2FpdCBmZXRjaCgnbXktY21zLmNvbS9hcGknLCB7CiAgICAgICAgbWV0aG9kOiAnUE9TVCcsCiAgICAgICAgYm9keTogY21zRGF0YTEubmV4dFBhZ2VRdWVyeSwKICAgICAgfSkpLmpzb24oKTsKCiAgICAgIHJldHVybiB7Li4uY21zRGF0YSwgbmV4dFBhZ2V9CiAgICB9KTsKICB9OwoKICBjb25zdCBoYW5kbGVSZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdEhhbmRsZXIoewogICAgYnVpbGQ6IHJlbWl4QnVpbGQsCiAgICBtb2RlOiBwcm9jZXNzLmVudi5OT0RFX0VOViwKICAgIGdldExvYWRDb250ZXh0OiAoKSA9PiAoewogICAgICBzZXNzaW9uLAogICAgICB3YWl0VW50aWwsCiAgICAgIHN0b3JlZnJvbnQsCiAgICAgIGVudiwKICAgICAgZmV0Y2hNeUNNUywKICAgIH0pLAogIH0pOwpgYGA=',
        },
      ],
    },
    {
      title: 'Update Remix to 1.14.0',
      pr: 'https://github.com/Shopify/hydrogen/pull/599',
      id: '599',
    },
    {
      title: 'Added Cache-Control defaults to all the demo store routes',
      pr: 'https://github.com/Shopify/hydrogen/pull/599',
      id: '599',
    },
    {
      title: 'Added new loader API for setting SEO tags within route module',
      pr: 'https://github.com/Shopify/hydrogen/pull/591',
      id: '591',
    },
    {
      title: 'ShopPayButton component now can receive a storeDomain',
      pr: 'https://github.com/Shopify/hydrogen/pull/645',
      id: '645',
    },
    {
      title:
        'Added robots option to SEO config that allows users granular control over the robots meta tag.',
      pr: 'https://github.com/Shopify/hydrogen/pull/572',
      id: '572',
      steps: [
        {
          title: 'Example usage',
          code: 'YGBgdHMKZXhwb3J0IGhhbmRsZSA9IHsKICBzZW86IHsKICAgIHJvYm90czogewogICAgICBub0luZGV4OiBmYWxzZSwKICAgICAgbm9Gb2xsb3c6IGZhbHNlLAogICAgfQogIH0KfQpgYGA=',
          file: 'All files that use SEO config',
        },
      ],
    },
    {
      title: 'Added decoding prop to the SpreadMedia component',
      pr: 'https://github.com/Shopify/hydrogen/pull/642',
      id: '642',
    },
  ],
} as CumulativeRelease;

describe('dependency removal', () => {
  it('removes specified dependencies before upgrading', async () => {
    const selectedRelease: Release = {
      title: 'Remix to React Router migration',
      version: '2025.5.0',
      hash: 'abc123',
      commit: 'https://github.com/Shopify/hydrogen/pull/2961',
      pr: 'https://github.com/Shopify/hydrogen/pull/2961',
      date: '2025-01-21',
      dependencies: {
        '@shopify/hydrogen': '2025.5.0',
        'react-router': '7.6.0',
        'react-router-dom': '7.6.0',
      },
      devDependencies: {
        '@react-router/dev': '7.6.0',
      },
      removeDependencies: [
        '@remix-run/react',
        '@remix-run/server-runtime',
        '@shopify/hydrogen',
      ],
      removeDevDependencies: ['@remix-run/dev', '@remix-run/fs-routes'],
      dependenciesMeta: {},
      fixes: [],
      features: [],
    };

    const currentDependencies = {
      '@shopify/hydrogen': '2025.4.0',
      '@remix-run/react': '2.16.1',
      '@remix-run/server-runtime': '2.16.1',
      '@remix-run/dev': '2.16.1',
      '@remix-run/fs-routes': '2.16.1',
      react: '^18.2.0',
    };

    const args = buildUpgradeCommandArgs({
      selectedRelease,
      currentDependencies,
    });

    // Should include new packages to install but not removed packages
    expect(args).toEqual([
      '@shopify/hydrogen@2025.5.0',
      'react-router@7.6.0',
      'react-router-dom@7.6.0',
      '@react-router/dev@7.6.0',
      '@react-router/fs-routes@7.6.0',
    ]);
  });

  it('handles empty remove dependencies arrays', async () => {
    const selectedRelease: Release = {
      title: 'Normal upgrade',
      version: '2025.4.1',
      hash: 'def456',
      commit: 'https://github.com/Shopify/hydrogen/pull/2950',
      pr: 'https://github.com/Shopify/hydrogen/pull/2950',
      date: '2025-01-15',
      dependencies: {
        '@shopify/hydrogen': '2025.4.1',
      },
      devDependencies: {},
      removeDependencies: [],
      removeDevDependencies: [],
      dependenciesMeta: {},
      fixes: [],
      features: [],
    };

    const currentDependencies = {
      '@shopify/hydrogen': '2025.4.0',
      react: '^18.2.0',
    };

    const args = buildUpgradeCommandArgs({
      selectedRelease,
      currentDependencies,
    });

    expect(args).toEqual(['@shopify/hydrogen@2025.4.1']);
  });

  it('handles migration with React Router dependency detection', async () => {
    const selectedRelease: Release = {
      title: 'React Router 7 migration with removal',
      version: '2025.5.0',
      hash: 'ghi789',
      commit: 'https://github.com/Shopify/hydrogen/pull/2961',
      pr: 'https://github.com/Shopify/hydrogen/pull/2961',
      date: '2025-01-21',
      dependencies: {
        '@shopify/hydrogen': '2025.5.0',
        'react-router': '7.6.0',
        'react-router-dom': '7.6.0',
      },
      devDependencies: {
        '@react-router/dev': '7.6.0',
        '@react-router/fs-routes': '7.6.0',
      },
      removeDependencies: ['@remix-run/react', '@shopify/hydrogen'],
      removeDevDependencies: ['@remix-run/dev'],
      dependenciesMeta: {},
      fixes: [],
      features: [],
    };

    // Current project has Remix dependencies but no React Router
    const currentDependencies = {
      '@shopify/hydrogen': '2025.4.0',
      '@remix-run/react': '2.16.1',
      '@remix-run/dev': '2.16.1',
      react: '^18.2.0',
    };

    const args = buildUpgradeCommandArgs({
      selectedRelease,
      currentDependencies,
    });

    // Should install new React Router packages since we're migrating
    expect(args).toEqual([
      '@shopify/hydrogen@2025.5.0',
      'react-router@7.6.0',
      'react-router-dom@7.6.0',
      '@react-router/dev@7.6.0',
      '@react-router/fs-routes@7.6.0',
    ]);
  });

  it('handles missing dependencies in removeDependencies gracefully', async () => {
    const selectedRelease: Release = {
      title: 'Release with missing dependencies to remove',
      version: '2025.5.0',
      hash: 'xyz123',
      commit: 'https://github.com/Shopify/hydrogen/pull/2962',
      pr: 'https://github.com/Shopify/hydrogen/pull/2962',
      date: '2025-01-21',
      dependencies: {
        '@shopify/hydrogen': '2025.5.0',
      },
      devDependencies: {
        '@shopify/cli': '~3.80.0',
      },
      // Try to remove dependencies that don't exist in the current project
      removeDependencies: ['@some/missing-package', '@another/nonexistent-dep'],
      removeDevDependencies: ['@dev/missing-package'],
      dependenciesMeta: {},
      fixes: [],
      features: [],
    };

    // Current project has only basic dependencies - missing packages listed in removeDependencies
    const currentDependencies = {
      '@shopify/hydrogen': '2025.4.0',
      react: '^18.2.0',
      '@shopify/cli': '~3.79.0',
    };

    // Should not crash and should only include packages that need upgrading
    const args = buildUpgradeCommandArgs({
      selectedRelease,
      currentDependencies,
    });

    // Should upgrade existing packages, ignore missing ones in removeDependencies
    expect(args).toEqual(['@shopify/hydrogen@2025.5.0', '@shopify/cli@3.80.0']);
  });
});
