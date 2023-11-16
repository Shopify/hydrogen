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
        async (appPath) => {
          const releases = changelog.releases;
          const current = await getHydrogenVersion({appPath});
          const availableUpgrades = getAvailableUpgrades({
            // @ts-expect-error
            releases,
            ...current,
          });

          const uniqueAvailableUpgrades = releases
            .slice(0, 2)
            .reduce((acc, release) => {
              // @ts-ignore
              if (acc[release.version]) return acc;
              return {
                ...acc,
                [release.version]: release,
              };
            }, {});

          expect(availableUpgrades).toMatchObject({
            availableUpgrades: releases.slice(0, 2),
            uniqueAvailableUpgrades,
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

      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const releases = changelog.releases;
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            // @ts-expect-error
            releases,
          });

          const selectedRelease = await getSelectedRelease({
            availableUpgrades,
            // @ts-ignore - we know this release version exists
            currentVersion: current.currentVersion,
            // OUTDATED_HYDROGEN_PACKAGE_JSON.dependencies['@shopify/hydrogen'],
            targetVersion: '2023.7.10',
          });

          expect(selectedRelease).toMatchObject({
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
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderSelectPrompt: vi.fn(),
        renderFatalError: vi.fn(),
        renderSuccess: vi.fn(),
      }));
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const releases = changelog.releases;
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            // @ts-expect-error
            releases,
          });

          await getSelectedRelease({
            availableUpgrades,
            // @ts-ignore - we know this release version exists
            currentVersion: current.currentVersion,
            targetVersion: '2023.1.5', // fails because this version is in the past
          }).catch(() => {});

          expect(renderSelectPrompt).toHaveBeenCalled();
        },
        {
          cleanGitRepo: true,
          packageJson: OUTDATED_HYDROGEN_PACKAGE_JSON,
        },
      );
    });

    it('prompts to select a release if no target --version is passed', async () => {
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderSelectPrompt: vi.fn(),
        renderFatalError: vi.fn(),
        renderSuccess: vi.fn(),
      }));

      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const releases = changelog.releases;

          //@ts-expect-error - we know this release version exists
          const previousHydrogenVersion = releases[1].version;

          //@ts-expect-error - we know this release version exists
          const latestHydrogenVersion = releases[0].version;

          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
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
        async (appPath) => {
          const releases = changelog.releases;
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            // @ts-expect-error
            releases,
          });

          const selectedRelease = await getSelectedRelease({
            availableUpgrades,
            // @ts-ignore - we know this release version exists
            currentVersion: current.currentVersion,
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
    it('returns the correct fixes and features for a release range thats outdated', async () => {
      await inTemporaryHydrogenRepo(
        async (appPath) => {
          const releases = changelog.releases;
          const current = await getHydrogenVersion({appPath});

          expect(current?.currentVersion).toBeDefined();

          const {availableUpgrades} = getAvailableUpgrades({
            ...current,
            // @ts-expect-error
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
    beforeEach(() => {
      vi.resetAllMocks();
      vi.resetModules();
      vi.clearAllMocks();
      vi.mock('@shopify/cli-kit/node/ui', () => ({
        renderInfo: vi.fn(),
        renderConfirmationPrompt: vi.fn(),
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

          const confimed = await displayConfirmation({
            appPath,
            cumulativeRelease: CUMMLATIVE_RELEASE,
            selectedRelease,
            targetVersion,
            dryRun,
          }).catch((error) => {
            console.log('error', error);
          });

          if (!confimed) return;

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
} as CummulativeRelease;
