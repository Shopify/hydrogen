import {execa} from 'execa';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  inTemporaryDirectory,
  writeFile,
  fileExists,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {
  renderSelectPrompt,
  renderInfo,
  renderConfirmationPrompt,
  renderTasks,
  renderSuccess,
  renderFatalError,
} from '@shopify/cli-kit/node/ui';
import {
  runUpgrade,
  upgradeNodeModules,
  getAvailableUpgrades,
  getSelectedRelease,
  getCummulativeRelease,
  displayConfirmation,
  buildUpgradeCommandArgs,
  getHydrogenVersion,
  type ChangeLog,
  type CummulativeRelease,
  type Dependencies,
} from './upgrade.js';
import changelog from '../../changelog.json';

vi.mock('@shopify/cli-kit/node/ui');
vi.mock('../../lib/shell.js');
vi.mock('@shopify/cli-kit/node/session');

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
    packageJson?: null | Record<string, unknown>;
  } = {
    cleanGitRepo: true,
    packageJson: null,
  },
) {
  return inTemporaryDirectory(async (tmpDir) => {
    // init the git repo
    await execa('git', ['init'], {cwd: tmpDir});

    if (packageJson) {
      const packageJsonPath = joinPath(tmpDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(packageJson));
      expect(await fileExists(packageJsonPath)).toBeTruthy();
    }

    // expect to be a git repo
    expect(await fileExists(joinPath(tmpDir, '/.git/config'))).toBeTruthy();

    if (cleanGitRepo) {
      await execa('git', ['add', 'package.json'], {cwd: tmpDir});
      await execa('git', ['commit', '-m', 'initial commit'], {cwd: tmpDir});
    }

    await cb(tmpDir);
  });
}

describe('upgrade', () => {
  describe('checkIsGitRepo', () => {
    it('renders an error message when not in a git repo', async () => {
      vi.mock('@shopify/cli-kit/node/ui', async () => {
        const actual = await vi.importActual<
          typeof import('@shopify/cli-kit/node/ui')
        >('@shopify/cli-kit/node/ui');
        return {
          ...actual,
          renderFatalError: vi.fn(),
        };
      });

      await inTemporaryDirectory(async (appPath) => {
        await runUpgrade({dryRun: false, appPath}).catch(() => {});
        expect(renderFatalError).toHaveBeenCalled();
        expect(renderFatalError).toHaveBeenCalledWith({
          name: 'error',
          type: 1,
          message: 'The upgrade command can only be run on a git repository',
          tryMessage: `Please run the command inside a git repository or run 'git init' to create one`,
        });
      });
    });
  });

  describe('checkDirtyGitBranch', () => {
    it('renders error message if the target git repo is dirty', async () => {
      vi.mock('@shopify/cli-kit/node/ui', async () => {
        const actual = await vi.importActual<
          typeof import('@shopify/cli-kit/node/ui')
        >('@shopify/cli-kit/node/ui');
        return {
          ...actual,
          renderFatalError: vi.fn(),
          renderSelectPrompt: vi.fn(),
        };
      });
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await runUpgrade({dryRun: false, appPath}).catch(() => {});
          expect(renderFatalError).toHaveBeenCalled();
          expect(renderFatalError).toHaveBeenCalledWith({
            name: 'error',
            type: 0,
            message:
              'The upgrade command can only be run on a clean git branch',
            tryMessage: `Please commit your changes or re-run the command on a clean branch`,
          });
        },
        {cleanGitRepo: false, packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON},
      );
    });
  });

  describe('getHydrogenVersion', () => {
    beforeEach(() => {
      vi.mock('@shopify/cli-kit/node/ui', async () => {
        const actual = await vi.importActual<
          typeof import('@shopify/cli-kit/node/ui')
        >('@shopify/cli-kit/node/ui');
        return {
          ...actual,
          renderFatalError: vi.fn(),
        };
      });
    });

    it('throws if no package.json is found', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await runUpgrade({dryRun: false, appPath}).catch(() => {});
          expect(renderFatalError).toHaveBeenCalled();
          expect(renderFatalError).toHaveBeenCalledWith({
            name: 'error',
            type: 0,
            message: 'Could not find a valid package.json',
            tryMessage: `Please make sure you are running the command in a npm project`,
          });
        },
        {packageJson: null},
      );
    });

    it('throws if no hydrogen version is found in package.json', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await runUpgrade({dryRun: false, appPath}).catch(() => {});
          expect(renderFatalError).toHaveBeenCalled();
          expect(renderFatalError).toHaveBeenCalledWith({
            name: 'error',
            type: 0,
            message: 'Could not find a valid Hydrogen version in package.json',
            tryMessage: `Please make sure you are running the command in a Hydrogen project`,
          });
        },
        {
          cleanGitRepo: true,
          packageJson: INVALID_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('returns the current hydrogen version from the package.json', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const hydrogen = await getHydrogenVersion({appPath});

          expect(hydrogen).toBeDefined();
          // @ts-expect-error - we know this release version exists
          expect(hydrogen.currentVersion).toMatch('^2023.1.6');
          // @ts-expect-error - we know this release version exists
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
  });

  // TODO: finish this test once merged and published so that package.json is accessible
  describe.skip('fetchChangelog', () => {
    it('fetches the latest changelog from the hydrogen repo', async () => {});

    it('renders an error message if the changelog could not be fetched', async () => {});
  });

  describe('getAvailableUpgrades', async () => {
    it('renders "already in the latest version" success message if no upgrades are available', async () => {
      vi.mock('@shopify/cli-kit/node/ui', async () => {
        const actual = await vi.importActual<
          typeof import('@shopify/cli-kit/node/ui')
        >('@shopify/cli-kit/node/ui');
        return {
          ...actual,
          renderSuccess: vi.fn(),
        };
      });

      await inTemporaryHydrogenRepo(
        async (appPath) => {
          await runUpgrade({dryRun: false, appPath});
          expect(renderSuccess).toHaveBeenCalled();
          expect(renderSuccess).toHaveBeenCalledWith({
            headline: expect.stringContaining(`You are on the latest Hydrogen`),
          });
        },
        {
          cleanGitRepo: true,
          packageJson: {
            dependencies: {
              // @ts-expect-error - we know this release version exists
              '@shopify/hydrogen': changelog.releases[0].version,
            },
          },
        },
      );
    });

    it('returns available upgrades and uniqueAvailableUpgrades if they exist', async () => {
      await inTemporaryHydrogenRepo(
        async () => {
          const releases = changelog.releases;
          const availableUpgrades = getAvailableUpgrades({
            // @ts-expect-error - we know this release version exists
            currentVersion: changelog.releases[2].version,
            // @ts-expect-error
            releases,
          });

          expect(availableUpgrades).toMatchObject({
            availableUpgrades: releases.slice(0, 2),
            uniqueAvailableUpgrades: {
              '2023.10.0': releases[0],
              '2023.7.13': releases[1],
            },
          });
        },
        {
          cleanGitRepo: true,
          packageJson: {
            dependencies: {
              // @ts-ignore
              '@shopify/hydrogen': changelog.releases[2].version,
            },
          },
        },
      );
    });
  });

  describe('getSelectedRelease', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('prioritizes a passed target --version over a select prompt if available', async () => {
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderSelectPrompt: vi.fn(),
      }));

      const releases = changelog.releases;
      const {availableUpgrades} = getAvailableUpgrades({
        currentVersion:
          OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'],
        // @ts-expect-error
        releases,
      });

      const selectedRelease = await getSelectedRelease({
        availableUpgrades,
        currentVersion:
          OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'],
        targetVersion: '2023.7.10',
      });

      expect(selectedRelease).toMatchObject({
        version: '2023.7.10',
      });
      expect(renderSelectPrompt).not.toHaveBeenCalled();
    });

    it('prompts if a passed target --version is not a valid upgradable version', async () => {
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderSelectPrompt: vi.fn(),
        renderFatalError: vi.fn(),
        renderSuccess: vi.fn(),
      }));

      const releases = changelog.releases;
      const {availableUpgrades} = getAvailableUpgrades({
        currentVersion:
          // e.g '@shopify/hydrogen': '^2023.1.6',
          OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'],
        // @ts-expect-error
        releases,
      });

      await getSelectedRelease({
        availableUpgrades,
        currentVersion:
          OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'],
        targetVersion: '2023.1.5', // fails because this version is in the past
      }).catch(() => {});

      expect(renderSelectPrompt).toHaveBeenCalled();
    });

    it('prompts to select a release if no target --version is passed', async () => {
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderSelectPrompt: vi.fn(),
        renderFatalError: vi.fn(),
        renderSuccess: vi.fn(),
      }));

      await inTemporaryHydrogenRepo(
        async () => {
          const releases = changelog.releases;

          //@ts-expect-error - we know this release version exists
          const previousHydrogenVersion = releases[1].version;

          //@ts-expect-error - we know this release version exists
          const latestHydrogenVersion = releases[0].version;

          const {availableUpgrades} = getAvailableUpgrades({
            currentVersion: previousHydrogenVersion,
            // @ts-expect-error
            releases,
          });

          await getSelectedRelease({
            availableUpgrades,
            currentVersion: previousHydrogenVersion,
          }).catch(() => {});

          expect(renderSelectPrompt).toHaveBeenCalledWith({
            message: expect.stringContaining(previousHydrogenVersion),
            choices: expect.arrayContaining([
              {
                label: expect.stringContaining(latestHydrogenVersion),
                value: expect.stringContaining(latestHydrogenVersion),
              },
            ]),
            defaultValue: latestHydrogenVersion,
          });
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('returns the prompted/selected release', async () => {
      const selectedVersion = '2023.7.10';
      vi.mocked(renderSelectPrompt).mockResolvedValue(selectedVersion);

      await inTemporaryHydrogenRepo(
        async () => {
          const releases = changelog.releases;
          const currentVersion =
            OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'];

          const {availableUpgrades} = getAvailableUpgrades({
            currentVersion,
            // @ts-expect-error
            releases,
          });

          const selectedRelease = await getSelectedRelease({
            availableUpgrades,
            currentVersion,
          });

          const release = releases.find(
            (release) => release.version === selectedVersion,
          ) as (typeof releases)[0];

          expect(renderSelectPrompt).toHaveBeenCalled();
          expect(selectedRelease).toMatchObject(release);
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });
  });

  describe('getCummulativeRelease', () => {
    it('returns the correct fixes and features for a release range', async () => {
      await inTemporaryHydrogenRepo(
        async () => {
          const releases =
            changelog.releases as unknown as ChangeLog['releases'];

          const currentVersion = '2023.7.10';

          // 2023.10.0
          const selectedRelease = releases.find(
            (release) => release.version === '2023.10.0',
          ) as (typeof releases)[0];

          const {features, fixes} = getCummulativeRelease({
            currentVersion,
            selectedRelease,
            releases,
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
    beforeEach(() => {
      vi.resetAllMocks();
      vi.resetModules();
      vi.clearAllMocks();
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderInfo: vi.fn(),
        renderConfirmationPrompt: vi.fn(),
        // renderSelectPrompt: vi.fn(),
        // renderFatalError: vi.fn(),
        // renderSuccess: vi.fn(),
      }));
    });
    it('renders a confirmation prompt that prompts to continue or return to the previous menu', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const releases =
            changelog.releases as unknown as ChangeLog['releases'];

          // 2023.10.0
          const selectedRelease = releases.find(
            (release) => release.version === '2023.10.0',
          ) as (typeof releases)[0];

          const targetVersion = undefined;
          const dryRun = false;

          await displayConfirmation({
            appPath,
            cumulativeRelease: CUMMLATIVE_RELEASE,
            selectedRelease,
            targetVersion,
            dryRun,
          }).catch((error) => {
            console.log('error', error);
          });

          expect(renderInfo).toHaveBeenCalledWith({
            headline: `Included in this upgrade:`,
            customSections: expect.arrayContaining([
              {
                title: 'Features',
                body: [
                  {
                    list: {
                      items: expect.arrayContaining(
                        CUMMLATIVE_RELEASE.features.map(
                          // @ts-ignore
                          (feature) => feature.title,
                        ),
                      ),
                    },
                  },
                ],
              },
              {
                title: 'Fixes',
                body: [
                  {
                    list: {
                      items: expect.arrayContaining(
                        CUMMLATIVE_RELEASE.fixes.map(
                          // @ts-ignore
                          (feature) => feature.title,
                        ),
                      ),
                    },
                  },
                ],
              },
            ]),
          });

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

  describe('upgradeNodeModules', () => {
    beforeEach(() => {
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderTasks: vi.fn(),
        renderSelectPrompt: vi.fn(),
        renderFatalError: vi.fn(),
        renderSuccess: vi.fn(),
        renderInfo: vi.fn(),
        renderConfirmationPrompt: vi.fn(),
      }));
    });

    it('runs the upgrade command task', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const releases =
            changelog.releases as unknown as ChangeLog['releases'];

          const selectedRelease = releases.find(
            (release) => release.version === '2023.10.0',
          ) as (typeof releases)[0];

          const currentDependencies = {
            ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
            ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
          } as Dependencies;

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
      const releases = changelog.releases as unknown as ChangeLog['releases'];

      const selectedRelease = releases.find(
        (release) => release.version === '2023.10.0',
      ) as (typeof releases)[0];

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
      } as Dependencies;

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

    it('does not upgrade remix deps if the current version is higher than that of the selected release', async () => {
      const releases = changelog.releases as unknown as ChangeLog['releases'];

      const selectedRelease = releases.find(
        (release) => release.version === '2023.10.0',
      ) as (typeof releases)[0];

      const currentDependencies = {
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies,
        '@remix-run/react': '2.2.0',
        ...OUTDATED_HYDROGEN_PACKAGE_JSON.devDependencies,
        '@remix-run/dev': '2.2.0',
      } as Dependencies;

      const result: string[] = [
        '@shopify/hydrogen@2023.10.0',
        '@shopify/cli-hydrogen@6.0.0',
        '@shopify/remix-oxygen@2.0.0',
        'typescript@5.2.2',
      ];

      const args = buildUpgradeCommandArgs({
        selectedRelease,
        currentDependencies,
      });

      expect(args).toEqual(expect.arrayContaining(result));
    });
  });
});

const OUTDATED_HYDROGEN_PACKAGE_JSON = {
  name: 'hello-world',
  private: true,
  sideEffects: false,
  version: '0.0.0',
  scripts: {
    build: 'shopify hydrogen build',
    dev: 'shopify hydrogen dev',
    preview: 'npm run build && shopify hydrogen preview',
    lint: 'eslint --no-error-on-unmatched-pattern --ext .js,.ts,.jsx,.tsx .',
    typecheck: 'tsc --noEmit',
    g: 'shopify hydrogen generate',
  },
  prettier: '@shopify/prettier-config',
  dependencies: {
    '@remix-run/react': '1.12.0',
    '@shopify/cli': '3.29.0',
    '@shopify/cli-hydrogen': '^4.0.8',
    '@shopify/hydrogen': '^2023.1.6',
    '@shopify/remix-oxygen': '^1.0.3',
    graphql: '^16.6.0',
    'graphql-tag': '^2.12.6',
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    'tiny-invariant': '^1.3.1',
  },
  devDependencies: {
    '@remix-run/dev': '1.12.0',
    '@shopify/oxygen-workers-types': '^3.17.2',
    '@shopify/prettier-config': '^1.1.2',
    '@types/eslint': '^8.4.10',
    '@types/react': '^18.0.20',
    '@types/react-dom': '^18.0.6',
    eslint: '^8.20.0',
    'eslint-plugin-hydrogen': '0.12.2',
    prettier: '^2.8.4',
    typescript: '^4.9.5',
  },
  engines: {
    node: '>=16.13',
  },
};

const INVALID_HYDROGEN_PACKAGE_JSON = {
  name: 'hello-world',
  dependencies: {},
};

const CUMMLATIVE_RELEASE = {
  fixes: [
    {
      title: 'Fix template dist package due to CI error',
      pr: 'https://github.com/Shopify/hydrogen/pull/1451',
      id: '1451',
    },
    {
      title: 'Custom cart methods are now stable',
      pr: 'https://github.com/Shopify/hydrogen/pull/1440',
      id: '1440',
      steps: [
        {
          title: 'Update `createCartHandler` if needed',
          code: 'Ly8gc2VydmVyLnRzCgpgYGBkaWZmCmNvbnN0IGNhcnQgPSBjcmVhdGVDYXJ0SGFuZGxlcih7CiAgIHN0b3JlZnJvbnQsCiAgIGdldENhcnRJZCwKICAgc2V0Q2FydElkOiBjYXJ0U2V0SWREZWZhdWx0KCksCi0gIGN1c3RvbU1ldGhvZHNfX3Vuc3RhYmxlOiB7CisgIGN1c3RvbU1ldGhvZHM6IHsKICAgICBhZGRMaW5lczogYXN5bmMgKGxpbmVzLCBvcHRpb25hbFBhcmFtcykgPT4gewogICAgICAvLyAuLi4KICAgICB9LAogICB9LAogfSk7CmBgYA==',
        },
      ],
    },
    {
      title: 'Remove deprecated parameters and props',
      info: '`createStorefrontClient` parameters `buyerIp` and `requestGroupId`. <Image> props `loaderOptions` and `widths`',
      pr: 'https://github.com/Shopify/hydrogen/pull/1435',
      id: '1435',
    },
    {
      title: 'Updated CLI dependencies to improve terminal output.',
      pr: 'https://github.com/Shopify/hydrogen/pull/1456',
      id: '1456',
      breaking: true,
      steps: [
        {
          title: 'Upgrade `@shopify/cli dependency`',
          code: 'YGBgYmFzaApucG0gYWRkIEBzaG9waWZ5L2NsaUAzLjUwLjAKYGBg',
        },
      ],
    },
    {
      title:
        'Updated the starter template `Header` and `Footer` menu components for 2023.10.0',
      pr: 'https://github.com/Shopify/hydrogen/pull/1465',
      id: '1465',
      breaking: true,
      info: 'The Storefront API 2023-10 now returns menu item URLs that include the `primaryDomainUrl`, instead of defaulting to the Shopify store ID URL (example.myshopify.com). The skeleton template requires changes to check for the `primaryDomainUrl`:',
      steps: [
        {
          title:
            'Update the HeaderMenu component to accept a primaryDomainUrl and include it in the internal url check',
          code: 'YGBgZGlmZgovLyBhcHAvY29tcG9uZW50cy9IZWFkZXIudHN4CgorIGltcG9ydCB0eXBlIHtIZWFkZXJRdWVyeX0gZnJvbSAnc3RvcmVmcm9udGFwaS5nZW5lcmF0ZWQnOwoKZXhwb3J0IGZ1bmN0aW9uIEhlYWRlck1lbnUoewogIG1lbnUsCisgIHByaW1hcnlEb21haW5VcmwsCiAgdmlld3BvcnQsCn06IHsKICBtZW51OiBIZWFkZXJQcm9wc1snaGVhZGVyJ11bJ21lbnUnXTsKKyAgcHJpbWFyeURvbWFpblVybDogSGVhZGVyUXVlcnlbJ3Nob3AnXVsncHJpbWFyeURvbWFpbiddWyd1cmwnXTsKICB2aWV3cG9ydDogVmlld3BvcnQ7Cn0pIHsKCiAgLy8gLi4uY29kZQoKICAvLyBpZiB0aGUgdXJsIGlzIGludGVybmFsLCB3ZSBzdHJpcCB0aGUgZG9tYWluCiAgY29uc3QgdXJsID0KICAgIGl0ZW0udXJsLmluY2x1ZGVzKCdteXNob3BpZnkuY29tJykgfHwKICAgIGl0ZW0udXJsLmluY2x1ZGVzKHB1YmxpY1N0b3JlRG9tYWluKSB8fAorICAgaXRlbS51cmwuaW5jbHVkZXMocHJpbWFyeURvbWFpblVybCkKICAgICAgPyBuZXcgVVJMKGl0ZW0udXJsKS5wYXRobmFtZQogICAgICA6IGl0ZW0udXJsOwoKICAgLy8gLi4uY29kZQoKfQpgYGA=',
          file: 'app/components/Header.tsx',
        },
        {
          title:
            'Update the FooterMenu component to accept a primaryDomainUrl prop and include it in the internal url check',
          code: 'YGBgZGlmZgovLyBhcHAvY29tcG9uZW50cy9Gb290ZXIudHN4CgotIGltcG9ydCB0eXBlIHtGb290ZXJRdWVyeX0gZnJvbSAnc3RvcmVmcm9udGFwaS5nZW5lcmF0ZWQnOworIGltcG9ydCB0eXBlIHtGb290ZXJRdWVyeSwgSGVhZGVyUXVlcnl9IGZyb20gJ3N0b3JlZnJvbnRhcGkuZ2VuZXJhdGVkJzsKCmZ1bmN0aW9uIEZvb3Rlck1lbnUoewogIG1lbnUsCisgIHByaW1hcnlEb21haW5VcmwsCn06IHsKICBtZW51OiBGb290ZXJRdWVyeVsnbWVudSddOworICBwcmltYXJ5RG9tYWluVXJsOiBIZWFkZXJRdWVyeVsnc2hvcCddWydwcmltYXJ5RG9tYWluJ11bJ3VybCddOwp9KSB7CiAgLy8gY29kZS4uLgoKICAvLyBpZiB0aGUgdXJsIGlzIGludGVybmFsLCB3ZSBzdHJpcCB0aGUgZG9tYWluCiAgY29uc3QgdXJsID0KICAgIGl0ZW0udXJsLmluY2x1ZGVzKCdteXNob3BpZnkuY29tJykgfHwKICAgIGl0ZW0udXJsLmluY2x1ZGVzKHB1YmxpY1N0b3JlRG9tYWluKSB8fAorICAgaXRlbS51cmwuaW5jbHVkZXMocHJpbWFyeURvbWFpblVybCkKICAgICAgPyBuZXcgVVJMKGl0ZW0udXJsKS5wYXRobmFtZQogICAgICA6IGl0ZW0udXJsOwoKICAgLy8gLi4uY29kZQoKICApOwp9CmBgYA==',
          file: 'app/components/Footer.tsx',
        },
        {
          title: 'Update the Footer component to accept a shop prop',
          code: 'YGBgZGlmZgpleHBvcnQgZnVuY3Rpb24gRm9vdGVyKHsKICBtZW51LAorIHNob3AsCn06IEZvb3RlclF1ZXJ5ICYge3Nob3A6IEhlYWRlclF1ZXJ5WydzaG9wJ119KSB7CiAgcmV0dXJuICgKICAgIDxmb290ZXIgY2xhc3NOYW1lPSJmb290ZXIiPgotICAgICAgPEZvb3Rlck1lbnUgbWVudT17bWVudX0gLz4KKyAgICAgIDxGb290ZXJNZW51IG1lbnU9e21lbnV9IHByaW1hcnlEb21haW5Vcmw9e3Nob3AucHJpbWFyeURvbWFpbi51cmx9IC8+CiAgICA8L2Zvb3Rlcj4KICApOwp9CmBgYA==',
          file: 'app/components/Footer.tsx',
        },
        {
          title: 'Update Layout.tsx to pass the shop prop',
          code: 'YGBgZGlmZgpleHBvcnQgZnVuY3Rpb24gTGF5b3V0KHsKICBjYXJ0LAogIGNoaWxkcmVuID0gbnVsbCwKICBmb290ZXIsCiAgaGVhZGVyLAogIGlzTG9nZ2VkSW4sCn06IExheW91dFByb3BzKSB7CiAgcmV0dXJuICgKICAgIDw+CiAgICAgIDxDYXJ0QXNpZGUgY2FydD17Y2FydH0gLz4KICAgICAgPFNlYXJjaEFzaWRlIC8+CiAgICAgIDxNb2JpbGVNZW51QXNpZGUgbWVudT17aGVhZGVyLm1lbnV9IHNob3A9e2hlYWRlci5zaG9wfSAvPgogICAgICA8SGVhZGVyIGhlYWRlcj17aGVhZGVyfSBjYXJ0PXtjYXJ0fSBpc0xvZ2dlZEluPXtpc0xvZ2dlZElufSAvPgogICAgICA8bWFpbj57Y2hpbGRyZW59PC9tYWluPgogICAgICA8U3VzcGVuc2U+CiAgICAgICAgPEF3YWl0IHJlc29sdmU9e2Zvb3Rlcn0+Ci0gICAgICAgICAgeyhmb290ZXIpID0+IDxGb290ZXIgbWVudT17Zm9vdGVyLm1lbnV9ICAvPn0KKyAgICAgICAgICB7KGZvb3RlcikgPT4gPEZvb3RlciBtZW51PXtmb290ZXIubWVudX0gc2hvcD17aGVhZGVyLnNob3B9IC8+fQogICAgICAgIDwvQXdhaXQ+CiAgICAgIDwvU3VzcGVuc2U+CiAgICA8Lz4KICApOwp9CmBgYA==',
          file: 'app/components/Layout.tsx',
        },
      ],
    },
    {
      title: 'Enhance useMatches returned type inference',
      pr: 'https://github.com/Shopify/hydrogen/pull/1289',
      id: '1289',
      steps: [
        {
          title:
            'If you are calling `useMatches()` in different places of your app to access the data returned by the root loader, you may want to update it to the following pattern to enhance types:',
          code: 'YGBgdHMKLy8gcm9vdC50c3gKCmltcG9ydCB7dXNlTWF0Y2hlc30gZnJvbSAnQHJlbWl4LXJ1bi9yZWFjdCc7CmltcG9ydCB7dHlwZSBTZXJpYWxpemVGcm9tfSBmcm9tICdAc2hvcGlmeS9yZW1peC1veHlnZW4nOwoKZXhwb3J0IGNvbnN0IHVzZVJvb3RMb2FkZXJEYXRhID0gKCkgPT4gewogIGNvbnN0IFtyb290XSA9IHVzZU1hdGNoZXMoKTsKICByZXR1cm4gcm9vdD8uZGF0YSBhcyBTZXJpYWxpemVGcm9tPHR5cGVvZiBsb2FkZXI+Owp9OwoKZXhwb3J0IGZ1bmN0aW9uIGxvYWRlcihjb250ZXh0KSB7CiAgLy8gLi4uCn0KYGBg',
        },
      ],
    },
    {
      title: 'Fix template dist package due to CI error',
      pr: 'https://github.com/Shopify/hydrogen/pull/1451',
      id: '1451',
    },
    {
      title:
        'Integrate the debug-network tooling with the new --worker-unstable runtime CLI flag',
      pr: 'https://github.com/Shopify/hydrogen/pull/1387',
      id: '1387',
    },
    {
      title:
        'Fix the starter template blog route to include a required startCursor in the GraphQL query',
      pr: 'https://github.com/Shopify/hydrogen/pull/1441',
      id: '1441',
    },
    {
      title: 'Move react to peer dependencies',
      pr: 'https://github.com/Shopify/hydrogen/pull/1439',
      id: '1439',
    },
    {
      title: 'Fix subrequest performance in development',
      pr: 'https://github.com/Shopify/hydrogen/pull/1411',
      id: '1411',
    },
    {
      title: 'Increase request body size limit to 100mb in development',
      pr: 'https://github.com/Shopify/hydrogen/pull/1421',
      id: '1421',
    },
  ],
  features: [
    {
      title: 'Added a client to query the Customer Account API',
      pr: 'https://github.com/Shopify/hydrogen/pull/1430',
      id: '1430',
      docs: 'https://shopify.dev/docs/api/hydrogen/latest/utilities/createcustomerclient',
    },
    {
      title: 'Update Storefront API version to 2023-10',
      pr: 'https://github.com/Shopify/hydrogen/pull/1431',
      id: '1431',
      docs: 'https://shopify.dev/docs/api/release-notes/2023-10#graphql-storefront-api-changes',
    },
    {
      title: 'Add query explorer plugin to GraphiQL',
      pr: 'https://github.com/Shopify/hydrogen/pull/1470',
      id: '1470',
      info: 'Start your dev server and load `http://localhost:3000/graphiql` to use GraphiQL',
    },
    {
      title: 'Added support for Remix v2.1.0 and now a peer dependency',
      pr: 'https://github.com/Shopify/hydrogen/pull/1289',
      id: '1289',
      breaking: true,
      info: 'Remix is now a peer dependency. This means that you can upgrade to newer Remix 2.x versions without upgrading Hydrogen',
      docs: 'https://github.com/remix-run/remix/releases/tag/remix%402.0.0',
    },
    {
      title:
        'The Codegen feature is now considered stable and related dependencies have been updated',
      pr: 'https://github.com/Shopify/hydrogen/pull/1108',
      id: '1108',
      breaking: true,
      info: 'Use --codegen flag instead of --codegen-unstable to generate code from your GraphQL queries',
      steps: [
        {
          title: 'Update the `dev` script',
          code: 'Ly8gcGFja2FnZS5qc29uCgpgYGBkaWZmCiJzY3JpcHRzIjogewogICAgIC8vLi4uLi4uCi0gICAgICJkZXYiOiAic2hvcGlmeSBoeWRyb2dlbiBkZXYgLS1jb2RlZ2VuLXVuc3RhYmxlIiwKKyAgICAiZGV2IjogInNob3BpZnkgaHlkcm9nZW4gZGV2IC0tY29kZWdlbiIsCn0KYGBg',
        },
        {
          title: 'Update the `codegen` script',
          code: 'Ly8gcGFja2FnZS5qc29uCgpgYGBkaWZmCiJzY3JpcHRzIjogewogICAgIC8vLi4uLi4uCi0gICAgImNvZGVnZW4iOiAic2hvcGlmeSBoeWRyb2dlbiBjb2RlZ2VuLXVuc3RhYmxlIiwKKyAgICJjb2RlZ2VuIjogInNob3BpZnkgaHlkcm9nZW4gY29kZWdlbiIKfQpgYGA=',
        },
      ],
    },
    {
      title:
        'The Storefront API types included are now generated using @graphql-codegen/typescript@4',
      docs: 'https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/typescript/typescript/CHANGELOG.md#400',
      pr: 'https://github.com/Shopify/hydrogen/pull/1108',
      id: '1108',
      breaking: true,
      steps: [
        {
          title:
            'This results in a breaking change if you were importing `Scalars` directly from `@shopify/hydrogen-react` or `@shopify/hydrogen`',
          code: 'Ly8gYWxsIGluc3RhbmNlcyBvZiBgU2NhbGFyc2AgaW1wb3J0cwoKYGBgZGlmZgppbXBvcnQgdHlwZSB7U2NhbGFyc30gZnJvbSAnQHNob3BpZnkvaHlkcm9nZW4vc3RvcmVmcm9udC1hcGktdHlwZXMnOwoKdHlwZSBQcm9wcyA9IHsKLSAgaWQ6IFNjYWxhcnNbJ0lEJ107IC8vIFRoaXMgd2FzIGEgc3RyaW5nCisgIGlkOiBTY2FsYXJzWydJRCddWydpbnB1dCddOyAvLyBOZWVkIHRvIGFjY2VzcyAnaW5wdXQnIG9yICdvdXRwdXQnIHRvIGdldCB0aGUgc3RyaW5nCiB9OwpgYGA=',
        },
      ],
    },
    {
      title:
        'The skeleton starter template is now versioned instead of the demo-store template',
      pr: null,
      id: null,
    },
    {
      title: 'Storefront client the default caching strategy has been updated ',
      pr: 'https://github.com/Shopify/hydrogen/pull/1336',
      id: '1336',
      steps: [
        {
          title:
            'The new default caching strategy provides a max-age value of 1 second, and a stale-while-revalidate value of 1 day. If you would keep the old caching values, update your queries to use `CacheShort`',
          code: 'Ly8gYWxsIGluc3RhbmNlcyBvZiBzdG9yZWZyb250LnF1ZXJ5CgpgYGBkaWZmCiBjb25zdCB7cHJvZHVjdH0gPSBhd2FpdCBzdG9yZWZyb250LnF1ZXJ5KAogICBgI2dyYXBocWwKICAgICBxdWVyeSBQcm9kdWN0KCRoYW5kbGU6IFN0cmluZyEpIHsKICAgICAgIHByb2R1Y3QoaGFuZGxlOiAkaGFuZGxlKSB7IGlkIHRpdGxlIH0KICAgICB9CiAgIGAsCiAgIHsKICAgICB2YXJpYWJsZXM6IHtoYW5kbGU6IHBhcmFtcy5wcm9kdWN0SGFuZGxlfSwKKyAgICAvKioKKyAgICAgKiBPdmVycmlkZSB0aGUgZGVmYXVsdCBjYWNoaW5nIHN0cmF0ZWd5IHdpdGggdGhlIG9sZCBjYWNoaW5nIHZhbHVlcworICAgICAqLworICAgIGNhY2hlOiBzdG9yZWZyb250LkNhY2hlU2hvcnQoKSwKICAgfSwKICk7CmBgYA==',
        },
      ],
    },
    {
      title:
        'JavaScript projects now use Codegen and JSDoc to enhance editor autocompletion',
      pr: 'https://github.com/Shopify/hydrogen/pull/1334',
      id: '1334',
    },
    {
      title:
        'Added `h2 debug cpu` command to profile CPU startup times (experimental)',
      pr: 'https://github.com/Shopify/hydrogen/pull/1352',
      info: 'This is useful for debugging slow startup times when Oxygen deployments fail with related errors.',
      id: '1352',
      steps: [
        {
          title: 'Run `h2 debug cpu`',
          code: 'YGBgYmFzaApoMiBkZWJ1ZyBjcHUKYGBg',
          info: 'This command builds + watches your app and generates a `startup.cpuprofile` file that you can open in DevTools or VSCode to see a flamegraph of CPU usage',
        },
      ],
    },
    {
      title: 'Added support for `withCache` request in debug-network tool',
      pr: 'https://github.com/Shopify/hydrogen/pull/1438',
      id: '1438',
      steps: [
        {
          title:
            'Calls to withCache can now be shown in the `/debug-network` tool when using the Worker runtime. For this to work, use the new `request` parameter in `createWithCache`',
          code: 'Ly8gc2VydmVyLnRzCgpgYGBkaWZmCmV4cG9ydCBkZWZhdWx0IHsKICBmZXRjaChyZXF1ZXN0LCBlbnYsIGV4ZWN1dGlvbkNvbnRleHQpIHsKICAgIC8vIC4uLgogICAgY29uc3Qgd2l0aENhY2hlID0gY3JlYXRlV2l0aENhY2hlKHsKICAgICAgY2FjaGUsCiAgICAgIHdhaXRVbnRpbCwKKyAgICAgcmVxdWVzdCwKICAgIH0pOwogICAgLy8gLi4uCiAgfSwKfQpgYGA=',
          file: 'server.ts',
        },
      ],
    },
    {
      title: 'Add LanguageCode support to hdyrogen-react CartProvider',
      pr: 'https://github.com/Shopify/hydrogen/pull/1408',
      id: '1408',
    },
    {
      title: 'Support custom attributes with `useLoadScript`',
      pr: 'https://github.com/Shopify/hydrogen/pull/1442',
      id: '1442',
      steps: [
        {
          title: 'Pass `attributes` to any script',
          code: 'Ly8gYW55IGluc3RhbmNlIG9mIHVzZUxvYWRTY3JpcHQKCmBgYGRpZmYKKyBjb25zdCBhdHRyaWJ1dGVzID0geworICAgICdkYXRhLXRlc3QnOiAndGVzdCcsCisgICAgdGVzdDogJ3Rlc3QnLAorICB9CgotIGNvbnN0IHNjcmlwdFN0YXR1cyA9IHVzZUxvYWRTY3JpcHQoJ3Rlc3QuanMnICkKY29uc3Qgc2NyaXB0U3RhdHVzID0gdXNlTG9hZFNjcmlwdCgndGVzdC5qcycsIHsgIGF0dHJpYnV0ZXMgfSApCmBgYA==',
        },
        {
          title: 'Would append a DOM element',
          code: 'YGBgaHRtbAo8c2NyaXB0IHNyYz0idGVzdC5qcyIgZGF0YS10ZXN0PSJ0ZXN0IiB0ZXN0PSJ0ZXN0IiAvPgpgYGA=',
        },
      ],
    },
    {
      title:
        'Unlock hydrogen-react package.json exports to make it easier to use with NextJS and other frameworks.',
      info: 'Note: Using Hydrogen internals is not officially supported, and those internal APIs could change at anytime outside our usual calendar versioning.',
      pr: 'https://github.com/Shopify/hydrogen/pull/994',
      id: '994',
    },
  ],
} as CummulativeRelease;
