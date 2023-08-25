/*
 * Test for upgrade command only
 * npm run test:watch ./src/commands/hydrogen/upgrade.test.ts
 */
import fss from 'fs/promises';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import * as fs from '@shopify/cli-kit/node/fs';
import {upgrade} from './upgrade.js';
import type {Choice} from './upgrade/types.js';

vi.mock('@shopify/cli-kit/node/node-package-manager', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/fs')
  >('@shopify/cli-kit/node/node-package-manager');

  return {
    ...original,
  };
});

vi.mock('@shopify/cli-kit/node/fs', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/fs')
  >('@shopify/cli-kit/node/fs');

  return {
    ...original,
  };
});

vi.mock('../../lib/remix-config.js', async () => {
  const original = await vi.importActual<
    typeof import('../../lib/remix-config.js')
  >('../../lib/remix-config.js');

  return {
    ...original,
  };
});

// vi.mock('./upgrade/index.js', async () => {
//   const original = await vi.importActual<typeof import('./upgrade/index.js')>(
//     './upgrade/index.js',
//   );
//
//   return {
//     ...original,
//   };
// });

vi.mock('./upgrade/index.js');
vi.mock('@shopify/cli-kit/node/ui');
// vi.mock('./upgrade/promptForUpgrade.js');
// vi.mock('./upgrade/promptDependencyUpdate.js');
// vi.mock('./upgrade/upgradePackages.js');
// vi.mock('./upgrade/getUpgradeCommand.js');
// vi.mock('./upgrade/getProjectDependencies.js');
// vi.mock('./upgrade/displayUpgradePlan.js');
// vi.mock('./upgrade/displayCurrentVersions.js');
// vi.mock('./upgrade/displayUpgradeSummary.js');

describe('upgrade', async () => {
  // const Upgrade = await import('./upgrade/index.js');
  // const RemixConfig = await import('../../lib/remix-config.js');
  // const NPM = await import('@shopify/cli-kit/node/node-package-manager');
  // const FS = await import('@shopify/cli-kit/node/fs');
  // const UI = await import('@shopify/cli-kit/node/ui');

  beforeEach((env) => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it.only('calls getProjectPaths', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const RemixConfig = await import('../../lib/remix-config.js');
      const getProjectPaths = vi.spyOn(RemixConfig, 'getProjectPaths');
      Upgrade.promptForUpgrade = vi.fn().mockResolvedValue([]);
      await upgrade({appPath});
      expect(getProjectPaths).toHaveBeenCalledWith(appPath);
    });
  });

  it.only('calls getPackageManager', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const NPM = await import('@shopify/cli-kit/node/node-package-manager');
      const getPackageManager = vi.spyOn(NPM, 'getPackageManager');
      Upgrade.promptForUpgrade = vi.fn().mockReturnValue(Promise.resolve([]));
      await upgrade({appPath});
      expect(getPackageManager).toHaveBeenCalledWith(appPath);
    });
  });

  it.only('renders notice that no packages were selected to upgrade', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const UI = await import('@shopify/cli-kit/node/ui');
      Upgrade.promptForUpgrade = vi.fn().mockReturnValue(Promise.resolve([]));

      const renderInfo = vi.spyOn(UI, 'renderInfo');

      await upgrade({appPath});

      expect(renderInfo).toHaveBeenCalledWith({
        body: 'No packages to upgrade.',
      });
    });
  });

  it.only('displays current versions banner', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const UI = await import('@shopify/cli-kit/node/ui');

      // mock an upgrade command to bypass it for this test
      Upgrade.getUpgradeCommand = vi.fn().mockReturnValue(
        Promise.resolve({
          dependencies: ['npm', 'i', '@shopify/hydrogen@2023.4.0', '-P'],
          devDependencies: [],
        }),
      );

      vi.mocked(UI.renderSelectPrompt).mockReturnValue(
        Promise.resolve([
          {
            name: '@shopify/hydrogen',
            version: '2023.4.0',
            type: 'dependency',
          },
        ]),
      );

      // select @shopify/hydrogen version to upgrade to
      // UI.renderSelectPrompt = vi.fn().mockReturnValue('2023.4.0');

      // mock a selected hydrogen version to bypass the no packages to upgrade message
      Upgrade.promptForUpgrade = vi.fn().mockReturnValue(
        Promise.resolve([
          {
            name: '@shopify/hydrogen',
            version: '2023.4.0',
            type: 'dependency',
          },
        ]),
      );

      // bypass displaying upgrade plan as it uses renderInfo too
      Upgrade.displayUpgradePlan = vi.fn().mockReturnValue(Promise.resolve());

      // bypass upgrading packages
      Upgrade.upgradePackages = vi.fn().mockReturnValue(Promise.resolve());

      // bypass displaying upgrade summary as it uses renderInfo too
      Upgrade.displayUpgradeSummary = vi
        .fn()
        .mockReturnValue(Promise.resolve());

      const renderInfo = vi.spyOn(UI, 'renderInfo');

      await upgrade({appPath});

      expect(renderInfo).toHaveBeenNthCalledWith(1, {
        headline: 'Current versions',
        body: '',
        customSections: [
          {
            body: [
              {
                list: {
                  items: [
                    '@shopify/hydrogen@^2023.1.5',
                    '@shopify/remix-oxygen@^1.1.0',
                  ],
                },
              },
            ],
            title: 'Dependencies',
          },
          {
            body: [
              {
                list: {
                  items: [
                    '@remix-run/dev@1.12.0',
                    '@remix-run/react@^1.15.0',
                    '@shopify/cli@^3.30.0',
                    '@shopify/cli-hydrogen@^5.0.0',
                    '@shopify/oxygen-workers-types@^3.17.2',
                    '@shopify/prettier-config@^1.1.2',
                  ],
                },
              },
            ],
            title: 'Dev dependencies',
          },
        ],
      });
    });
  });

  it.only('displays upgrade plan banner', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const version = '2023.4.0';

      Upgrade.promptForUpgrade = vi.fn().mockReturnValue(
        Promise.resolve([
          {
            name: '@shopify/hydrogen',
            version: '2023.4.0',
            type: 'dependency',
          },
        ]),
      );

      const UI = await import('@shopify/cli-kit/node/ui');
      vi.spyOn(UI, 'renderSelectPrompt').mockReturnValue(
        Promise.resolve('2023.4.0'),
      );

      const renderInfo = vi.spyOn(UI, 'renderInfo');

      // bypass upgrading packages
      Upgrade.upgradePackages = vi.fn().mockReturnValue(Promise.resolve());

      // bypass displaying upgrade summary as it uses renderInfo too
      Upgrade.displayUpgradeSummary = vi
        .fn()
        .mockReturnValue(Promise.resolve());

      await upgrade({appPath});

      expect(renderInfo).toHaveBeenNthCalledWith(2, {
        headline: 'Upgrading',
        body: '',
        customSections: [
          {
            body: [
              {
                list: {
                  items: [`@shopify/hydrogen@${version}`],
                },
              },
            ],
            title: 'Dependencies',
          },
        ],
      });
    });
  });

  it('prompts for the correct @shopify/hydrogen versions', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const UI = await import('@shopify/cli-kit/node/ui');
      const Upgrade = await import('./upgrade/index.js');
      // const renderSelectPrompt = vi.spyOn(UI, 'renderSelectPrompt');
      const name = '@shopify/hydrogen';
      const version = '2023.4.0';

      let choices: Array<Choice<string>> = [];
      const hydrogenSelectPrompt = vi
        .spyOn(UI, 'renderSelectPrompt')
        //@ts-ignore
        .mockImplementation((params) => {
          if (
            //@ts-ignore
            params?.message?.includes('@shopify/hydrogen') &&
            !choices.length
          ) {
            //@ts-ignore
            choices = params.choices;
            return Promise.resolve(version);
          }
        });

      await Upgrade.promptForUpgrade({
        dependencies: OUTDATED_PACKAGE_JSON.dependencies,
        devDependencies: OUTDATED_PACKAGE_JSON.devDependencies,
      });

      expect(hydrogenSelectPrompt).toHaveBeenNthCalledWith(1, {
        message: `Select the ${name} version to upgrade to: (current ${version})`,
        choices,
        defaultValue: '2023.1.6',
      });
    });
  });

  it.skip("doesn't prompt for @shopify/cli-hydrogen if a @shopify/hydrogen is selected", async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const UI = await import('@shopify/cli-kit/node/ui');

      let promptedForCliHydrogen = false;

      vi.spyOn(UI, 'renderSelectPrompt')
        //@ts-ignore
        .mockImplementation((params) => {
          //@ts-ignore
          if (params?.message?.includes('@shopify/hydrogen')) {
            return Promise.resolve('2023.1.6');
          }

          //@ts-ignore
          if (params?.message?.includes('@shopify/cli-hydrogen')) {
            // We shouldn't get here because choosing a hydrogen version
            // automatically selects the corresponding cli-hydrogen version
            promptedForCliHydrogen = true;
            return Promise.resolve(null);
          }
        });

      const deps = await Upgrade.getProjectDependencies({
        packageJsonPath: `${appPath}/package.json`,
      });

      await Upgrade.promptForUpgrade(deps);

      expect(promptedForCliHydrogen).toBeFalsy();
    });
  });

  it.skip('prompts for @shopify/cli-hydrogen if a @shopify/hydrogen is not selected', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const UI = await import('@shopify/cli-kit/node/ui');

      let promptedForCliHydrogen = false;

      vi.spyOn(UI, 'renderSelectPrompt')
        //@ts-ignore
        .mockImplementation((params) => {
          //@ts-ignore
          if (params?.message?.includes('@shopify/hydrogen')) {
            return Promise.resolve(null);
          }

          //@ts-ignore
          if (params?.message?.includes('@shopify/cli-hydrogen')) {
            promptedForCliHydrogen = true;
            return Promise.resolve('5.0.0');
          }
        });

      const deps = await Upgrade.getProjectDependencies({
        packageJsonPath: `${appPath}/package.json`,
      });

      await Upgrade.promptForUpgrade(deps);
      expect(promptedForCliHydrogen).toBeTruthy();
    });
  });

  it.skip('gets the correct @shopify/cli-hydrogen version for the selected @shopify/hydrogen version', async () => {
    await mockOutdatedHydrogenProject(async ({appPath}) => {
      const Upgrade = await import('./upgrade/index.js');
      const UI = await import('@shopify/cli-kit/node/ui');

      vi.spyOn(UI, 'renderSelectPrompt')
        //@ts-ignore
        .mockImplementation((params) => {
          //@ts-ignore
          if (params?.message.includes('@shopify/hydrogen')) {
            return '2023.4.0';
          }
        });

      const deps = await Upgrade.getProjectDependencies({
        packageJsonPath: `${appPath}/package.json`,
      });

      const packagesToUpgrade = await Upgrade.promptForUpgrade(deps);

      const hydrogenCli = packagesToUpgrade.find(
        (pkg) => pkg.name === '@shopify/cli-hydrogen',
      );

      expect(hydrogenCli).toEqual({
        version: '5.0.1',
        name: '@shopify/cli-hydrogen',
        type: 'devDependency',
      });
    });
  });

  // it.only('gets the correct @shopify/cli-hydrogen version for the selected @shopify/hydrogen version', async () => {
  //   await mockOutdatedHydrogenProject(async ({appPath}) => {
  //     let calledGetRequiredHydrogenCli = false;
  //
  //     const getRequiredHydrogenCli = vi.spyOn(
  //       Upgrade,
  //       'getRequiredHydrogenCli',
  //     );
  //
  //     // vi.spyOn(Upgrade, 'getRequiredHydrogenCli').mockImplementation(
  //     //   (params) => {
  //     //     calledGetRequiredHydrogenCli = true;
  //     //     return Promise.resolve({
  //     //       name: '@shopify/cli-hydrogen',
  //     //       version: '5.0.1',
  //     //       type: 'devDependency',
  //     //     });
  //     //   },
  //     // );
  //
  //     vi.spyOn(UI, 'renderSelectPrompt')
  //       //@ts-ignore
  //       .mockImplementation((params) => {
  //         //@ts-ignore
  //         if (params?.message.includes('@shopify/hydrogen')) {
  //           return '2023.4.0';
  //         }
  //       });
  //
  //     // mock an upgrade command to bypass it for this test
  //     Upgrade.getUpgradeCommand = vi.fn().mockReturnValue(
  //       Promise.resolve({
  //         dependencies: ['npm', 'i', '@shopify/hydrogen@2023.4.0', '-P'],
  //         devDependencies: [],
  //       }),
  //     );
  //
  //     // bypass displaying upgrade plan as it uses renderInfo too
  //     Upgrade.displayCurrentVersions = vi
  //       .fn()
  //       .mockReturnValue(Promise.resolve());
  //
  //     // bypass upgrading packages
  //     Upgrade.upgradePackages = vi.fn().mockReturnValue(Promise.resolve());
  //
  //     // bypass displaying upgrade summary as it uses renderInfo too
  //     Upgrade.displayUpgradeSummary = vi
  //       .fn()
  //       .mockReturnValue(Promise.resolve());
  //
  //     await upgrade({appPath});
  //
  //     // expect(calledGetRequiredHydrogenCli).toBeTruthy();
  //
  //     expect(getRequiredHydrogenCli).toHaveReturnedWith({
  //       version: '5.0.1',
  //       name: '@shopify/cli-hydrogen',
  //       type: 'devDependency',
  //     });
  //   });
  // });
});

/**
 * Create a new temporary directory and write a test package.json file to it
 */
async function mockOutdatedHydrogenProject(
  callback: ({appPath}: {appPath: string}) => Promise<void>,
) {
  await fs.inTemporaryDirectory(async (appPath) => {
    try {
      await fss.mkdir(`${appPath}/public`);
      await fss.mkdir(`${appPath}/build`);
      await fss.writeFile(
        `${appPath}/package.json`,
        JSON.stringify(OUTDATED_PACKAGE_JSON, null, 2),
      );

      // check that we wrote the package.json
      await fss.access(`${appPath}/package.json`, fss.constants.F_OK);

      const RemixConfig = await import('../../lib/remix-config.js');

      // mock getProjectPaths for all environments
      RemixConfig.getProjectPaths = vi.fn().mockReturnValue({
        packageJsonPath: `${appPath}/package.json`,
        root: appPath,
        buildPath: `${appPath}/build`,
        publicPath: `${appPath}/public`,
        buildPathClient: `${appPath}/build/client`,
        buildPathWorkerFile: `${appPath}/build/worker.js`,
      });

      return callback({appPath});
    } catch (error) {
      console.error('Error setting temporary directory', error);
    }
  });
}

const OUTDATED_PACKAGE_JSON = {
  name: 'outdated-storefront',
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
    '@shopify/hydrogen': '^2023.1.5',
    '@shopify/remix-oxygen': '^1.1.0',
    '@uiw/react-md-editor': '^3.20.5',
    graphql: '^16.6.0',
    'graphql-tag': '^2.12.6',
    isbot: '^3.6.13',
    'markdown-it': '^13.0.1',
    'markdown-to-jsx': '^7.1.9',
    'mdast-util-from-markdown': '^1.3.0',
    react: '^18.2.0',
    'react-dom': '^18.2.0',
    'react-markdown': '^8.0.5',
    'react-markdown-editor-lite': '^1.3.4',
    'remark-parse': '^10.0.1',
    slate: '^0.91.4',
    'slate-react': '^0.91.9',
    slugify: '^1.6.5',
    'tiny-invariant': '^1.3.1',
    unified: '^10.1.2',
  },
  devDependencies: {
    '@remix-run/dev': '1.12.0',
    '@remix-run/react': '^1.15.0',
    '@shopify/cli': '^3.30.0',
    '@shopify/cli-hydrogen': '^5.0.0',
    '@shopify/oxygen-workers-types': '^3.17.2',
    '@shopify/prettier-config': '^1.1.2',
    '@types/eslint': '^8.4.10',
    '@types/markdown-it': '^12.2.3',
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
