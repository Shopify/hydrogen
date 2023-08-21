import path from 'path';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderError,
  renderInfo,
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../lib/flags.js';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import {execa} from 'execa';
import {fileExists, readFile} from '@shopify/cli-kit/node/fs';
import {getProjectPaths} from '../../lib/remix-config.js';
import TimeAgo from 'javascript-time-ago';
import semver from 'semver';

export type RenderCommandProps = {
  appPath: string;
};

type Dependencies = Record<string, string>;

type Choice<T> = {
  label: string;
  value: T;
  key?: string;
  group?: string;
};

type SupportedPackage =
  | '@shopify/hydrogen'
  | '@shopify/cli-hydrogen'
  | '@shopify/cli'
  | '@shopify/remix-oxygen'
  | '@shopify/oxygen-workers-types'
  | '@shopify/prettier-config';

type PackageToUpgrade = {
  version: string;
  name: SupportedPackage;
  type: 'dependency' | 'devDependency';
};

type CmdArgs = Array<string>;

type Cmd = {
  dependencies: CmdArgs;
  devDependencies: CmdArgs;
  peerDependencies?: CmdArgs;
};

export default class Upgrade extends Command {
  static description = 'Upgrade Remix and Hydrogen npm dependencies.';

  static flags = {
    path: commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Upgrade);
    const appPath = flags.path ? path.resolve(flags.path) : process.cwd();
    await upgrade({appPath});
  }
}

/**
 * Upgrade hydrogen, cli-hydrogen, remix-oxygen, oxygen-workers-types, prettier-config, and @shopify/cli
 * @param appPath - Path to the Hydrogen app
 * @returns void
 */
async function upgrade({appPath}: RenderCommandProps) {
  const {packageJsonPath} = getProjectPaths(appPath);

  if (!(await fileExists(packageJsonPath))) {
    throw new Error(
      `No package.json found at ${packageJsonPath}. Consider using the --path flag to point to your Hydrogen app root folder.`,
    );
  }

  const packageManager = await getPackageManager(appPath);

  const packagesToUpdate = await promptForUpgrade({packageJsonPath});

  if (!packagesToUpdate.length) {
    renderInfo({body: 'No packages selected for upgrade.'});
    return;
  }

  await displayUpgradePlan({packagesToUpdate});

  const cmd = await getUpgradeCommand({
    packageManager,
    packagesToUpdate,
  });

  await upgradePackages({cmd, appPath});

  await displayUpgradeSummary({packageJsonPath, packagesToUpdate});
}

async function initTimeAgo() {
  let locale = Intl.DateTimeFormat().resolvedOptions().locale;
  if (!locale) {
    locale = 'en';
  } else {
    locale = locale.split('-')[0] || 'en';
  }

  let {default: userLocale} = await import(
    `javascript-time-ago/locale/${locale}`
  );

  if (!userLocale) {
    const {default: en} = await import('javascript-time-ago/locale/en');
    userLocale = en;
  }

  TimeAgo.addDefaultLocale(userLocale);
  const timeAgo = new TimeAgo(locale);

  return timeAgo;
}

function displayCurrentVersions({
  dependencies,
  devDependencies,
}: {
  dependencies: Dependencies;
  devDependencies: Dependencies;
}) {
  const upgradeableDependencies = Object.keys(dependencies).reduce(
    (filtered, dep) => {
      const depKey = dep as keyof typeof dependencies;
      const updgradable =
        dep.startsWith('@shopify') || dep.startsWith('@remix-run');
      if (updgradable) {
        filtered.push(`${depKey}@${dependencies[dep]}`);
      }
      return filtered;
    },
    [] as string[],
  );

  const upgradableDevDependencies = Object.keys(devDependencies).reduce(
    (filtered, dep) => {
      const depKey = dep as keyof typeof devDependencies;
      const updgradable =
        dep.startsWith('@shopify') || dep.startsWith('@remix-run');
      if (updgradable) {
        filtered.push(`${depKey}@${devDependencies[dep]}`);
      }
      return filtered;
    },
    [] as string[],
  );

  renderInfo({
    headline: 'Current versions',
    // @ts-expect-error we know that the filter above will remove all falsy values
    customSections: [
      upgradeableDependencies.length && {
        title: 'Dependencies\n',
        body: [
          {
            list: {
              items: upgradeableDependencies,
            },
          },
        ],
      },
      upgradableDevDependencies.length && {
        title: 'Dev dependencies',
        body: [
          {
            list: {
              items: upgradableDevDependencies,
            },
          },
        ],
      },
    ].filter(Boolean),
    body: '',
  });
}

/**
 * Given a Hydrogen version we want to upgrade to and the current Hydrogen-cli version,
 * it returns the minimum Hydrogen-cli version that supports the Hydrogen version
 * based on the @shopify/hydrogen-react peer dependency of the Hydrogen version.
 * @param selectedHydrogen - The Hydrogen version to upgrade to
 * @param allDeps - All dependencies in the package.json
 */
async function getRequiredHydrogenCli({
  selectedHydrogen,
  currentHydrogenCliVersion,
}: {
  selectedHydrogen: PackageToUpgrade;
  currentHydrogenCliVersion: string | undefined;
}): Promise<PackageToUpgrade> {
  if (!currentHydrogenCliVersion) {
    throw new Error(
      'Could not find the current @shopify/cli-hydrogen version in the package.json',
    );
  }

  if (!selectedHydrogen.version) {
    return {
      version: currentHydrogenCliVersion,
      name: '@shopify/cli-hydrogen',
      type: getDependencyType('@shopify/cli-hydrogen'),
    };
  }

  // get hydrogen-react version for the selected hydrogen version
  const {stdout: requiredH2ReactVersion} = await execa(
    'npm',
    [
      'view',
      `@shopify/hydrogen@${selectedHydrogen.version}`,
      'dependencies.@shopify/hydrogen-react',
    ],
    {},
  );

  const pinnedHydrogenCliVersion = currentHydrogenCliVersion.replace(
    /^[\^~]/,
    '',
  );

  // get all cli-hydrogen versions that support the required hydrogen-react version
  const {stdout: rawCliVersionsForSelectedHydrogenReact} = await execa(
    'npm',
    [
      'view',
      `@shopify/cli-hydrogen@>=${pinnedHydrogenCliVersion}`,
      'peerDependencies.@shopify/hydrogen-react',
    ],
    {},
  );

  const defaultCliVersions = {} as Record<string, string>;

  const cliVersionsForSelectedHydrogenReact =
    rawCliVersionsForSelectedHydrogenReact
      .split('\n')
      .filter(Boolean)
      .reduce((acc, line: string) => {
        const [cliPkg, rawHydrogenReactVersion] = line.split(' ');
        if (!cliPkg || !rawHydrogenReactVersion) return acc;
        const cliVersion = cliPkg.replace(/^@shopify\/cli-hydrogen@/, '');

        const h2ReactVersion = rawHydrogenReactVersion
          .replace(/\^/, '')
          .replace(/'/g, '');
        return {
          ...acc,
          [h2ReactVersion]: cliVersion,
        };
      }, defaultCliVersions);

  const requiredCliVersion =
    cliVersionsForSelectedHydrogenReact[requiredH2ReactVersion];

  if (!requiredCliVersion) {
    throw new Error(
      `Could not find a @shopify/cli-hydrogen version that supports @shopify/hydrogen@${selectedHydrogen.version}`,
    );
  }

  return {
    version: requiredCliVersion,
    name: '@shopify/cli-hydrogen',
    type: getDependencyType('@shopify/cli-hydrogen'),
  };
}

async function getRequiredRemixOxygen({
  selectedHydrogenCli,
}: {
  selectedHydrogenCli: PackageToUpgrade;
}): Promise<PackageToUpgrade> {
  const {stdout: requiredOxygenVersion} = await execa(
    'npm',
    [
      'view',
      `@shopify/cli-hydrogen@${selectedHydrogenCli.version}`,
      'peerDependencies.@shopify/remix-oxygen',
    ],
    {},
  );

  const pinnedOxygenVersion = requiredOxygenVersion.replace(/^[\^~]/, '');

  return {
    version: pinnedOxygenVersion,
    name: '@shopify/remix-oxygen',
    type: getDependencyType('@shopify/remix-oxygen'),
  };
}

/**
 * Display the multiple prompts to select which packages to upgrade
 * @param packageJsonPath - Path to the Hydrogen app's package.json
 * @returns Array of packages to upgrade
 */
async function promptForUpgrade({
  packageJsonPath,
}: {
  packageJsonPath: string;
}): Promise<PackageToUpgrade[]> {
  const {dependencies, devDependencies} = await getProjectDependencies({
    packageJsonPath,
  });

  const timeAgo = await initTimeAgo();
  const promptDependencyUpdate = _promptDependencyUpdate(timeAgo);

  displayCurrentVersions({dependencies, devDependencies});

  const selectedHydrogen = await promptDependencyUpdate({
    name: '@shopify/hydrogen',
    dependency: dependencies['@shopify/hydrogen'],
  });

  let selectedHydrogenCli;
  let selectedRemixOxygen;

  if (selectedHydrogen) {
    selectedHydrogenCli = await getRequiredHydrogenCli({
      selectedHydrogen,
      currentHydrogenCliVersion:
        dependencies['@shopify/cli-hydrogen'] ||
        devDependencies['@shopify/cli-hydrogen'],
    });

    // Need to find the correct remix-oxygen version to upgrade to
    selectedRemixOxygen = await getRequiredRemixOxygen({
      selectedHydrogenCli,
    });
  } else {
    // If we don't have a selectedHydrogen, we prompt for the Hydrogen-cli version
    selectedHydrogenCli = await promptDependencyUpdate({
      name: '@shopify/cli-hydrogen',
      dependency:
        dependencies['@shopify/cli-hydrogen'] ||
        devDependencies['@shopify/cli-hydrogen'],
    });

    // If we have a selectedHydrogenCli, we can find the correct remix-oxygen version to upgrade to
    if (selectedHydrogenCli) {
      selectedRemixOxygen = await getRequiredRemixOxygen({
        selectedHydrogenCli,
      });
    } else {
      // user didn't select a hydrogen-cli version, so we prompt for the remix-oxygen version
      selectedRemixOxygen = await promptDependencyUpdate({
        name: '@shopify/remix-oxygen',
        dependency:
          dependencies['@shopify/remix-oxygen'] ||
          devDependencies['@shopify/remix-oxygen'],
      });
    }
  }

  // generic packages without inter-dependencies
  const selectedWorkersTypes = await promptDependencyUpdate({
    name: '@shopify/oxygen-workers-types',
    dependency:
      dependencies['@shopify/oxygen-workers-types'] ||
      devDependencies['@shopify/oxygen-workers-types'],
  });

  const selectedPrettierConfig = await promptDependencyUpdate({
    name: '@shopify/prettier-config',
    dependency: devDependencies['@shopify/prettier-config'],
  });

  const selectedShopifyCli = await promptDependencyUpdate({
    name: '@shopify/cli',
    dependency: dependencies['@shopify/cli'] || devDependencies['@shopify/cli'],
  });

  const packagesToUpdate = [
    selectedHydrogen,
    selectedHydrogenCli,
    selectedRemixOxygen,
    selectedWorkersTypes,
    selectedPrettierConfig,
    selectedShopifyCli,
  ].filter(Boolean);

  // @ts-expect-error we know that the filter above will remove all falsy values
  return packagesToUpdate;
}

/**
 * Display the selected packages to upgrade split into dependencies and devDependencies
 * @param packagesToUpdate - Array of packages to upgrade
 * @returns void
 */
async function displayUpgradePlan({
  packagesToUpdate,
}: {
  packagesToUpdate: PackageToUpgrade[];
}) {
  let depDevDeps = {
    dependencies: [],
    devDependencies: [],
  } as {
    dependencies: Array<string>;
    devDependencies: Array<string>;
  };

  const {dependencies, devDependencies} = packagesToUpdate.reduce(
    (acc, pkg) => {
      const item = `${pkg.name}@${pkg.version}`;
      if (pkg.type === 'dependency') {
        acc.dependencies.push(item);
      } else {
        acc.devDependencies.push(item);
      }
      return acc;
    },
    depDevDeps,
  );

  renderInfo({
    headline: 'Upgading',
    body: '',
    // @ts-expect-error we know that the filter above will remove all falsy values
    customSections: [
      dependencies.length && {
        title: 'Dependencies\n',
        body: [
          {
            list: {
              items: dependencies,
            },
          },
        ],
      },
      devDependencies.length && {
        title: 'Dev dependencies',
        body: [
          {
            list: {
              items: devDependencies,
            },
          },
        ],
      },
    ].filter(Boolean),
  });
}

/**
 * Display the summary of the packages that were upgraded, including any that failed
 * @param packageJsonPath - Path to the package.json file
 * @param packagesToUpdate - Array of packages to upgrade
 * @returns void
 **/
async function displayUpgradeSummary({
  packageJsonPath,
  packagesToUpdate,
}: {
  packageJsonPath: string;
  packagesToUpdate: PackageToUpgrade[];
}) {
  // get the updated package.json dependencies
  const updatedPackageJson = await getProjectDependencies({
    packageJsonPath,
  });

  const successFailure = {
    success: [],
    failure: [],
  } as {
    success: PackageToUpgrade[];
    failure: PackageToUpgrade[];
  };

  const {success, failure} = packagesToUpdate.reduce((acc, pkg) => {
    const {name, version, type} = pkg;
    const _updatedVersion =
      type === 'dependency'
        ? updatedPackageJson.dependencies[name]
        : updatedPackageJson.devDependencies[name];

    if (!_updatedVersion) {
      acc.failure.push(pkg);
      return acc;
    }

    const updatedVersion = _updatedVersion.startsWith('^')
      ? _updatedVersion.slice(1)
      : _updatedVersion;

    if (updatedVersion === version) {
      acc.success.push(pkg);
    } else {
      acc.failure.push(pkg);
    }
    return acc;
  }, successFailure);

  let depDevDeps = {
    dependencies: [],
    devDependencies: [],
  } as {
    dependencies: Array<string>;
    devDependencies: Array<string>;
  };

  if (success.length) {
    const {dependencies, devDependencies} = success.reduce((acc, pkg) => {
      const item = `${pkg.name}@${pkg.version}`;
      if (pkg.type === 'dependency') {
        acc.dependencies.push(item);
      } else {
        acc.devDependencies.push(item);
      }
      return acc;
    }, depDevDeps);

    renderSuccess({
      headline: 'Successfully upgraded',
      body: '',
      // @ts-expect-error we know that the filter above will remove all falsy values
      customSections: [
        dependencies.length && {
          title: 'Dependencies\n',
          body: [
            {
              list: {
                items: dependencies,
              },
            },
          ],
        },
        devDependencies.length && {
          title: 'Dev dependencies',
          body: [
            {
              list: {
                items: devDependencies,
              },
            },
          ],
        },
      ].filter(Boolean),
    });
  }

  if (failure.length) {
    const {dependencies, devDependencies} = failure.reduce((acc, pkg) => {
      const item = `${pkg.name}@${pkg.version}`;
      if (pkg.type === 'dependency') {
        acc.dependencies.push(item);
      } else {
        acc.devDependencies.push(item);
      }
      return acc;
    }, depDevDeps);

    renderError({
      headline: 'Failed to upgrade',
      body: '',
      // @ts-expect-error we know that the filter above will remove all falsy values
      customSections: [
        dependencies.length && {
          title: 'Dependencies\n',
          body: [
            {
              list: {
                items: dependencies,
              },
            },
          ],
        },
        devDependencies.length && {
          title: 'Dev dependencies',
          body: [
            {
              list: {
                items: devDependencies,
              },
            },
          ],
        },
      ].filter(Boolean),
    });
  }
}

/**
 * Get the npm, yarn or pnpm command to upgrade both dependencies and devDependencies
 * @param packageManager - The package manager to use
 * @param pkg - The package to upgrade
 * @returns Cmd
 **/
async function getUpgradeCommand({
  packageManager,
  packagesToUpdate,
}: {
  packageManager: Awaited<ReturnType<typeof getPackageManager>>;
  packagesToUpdate: PackageToUpgrade[];
}) {
  const cmd = {
    dependencies: [],
    devDependencies: [],
  } as Cmd;

  // get the commands to upgrade for each package
  for (const pkg of packagesToUpdate) {
    let pkgCmd;
    if (
      pkg.name === '@shopify/hydrogen' ||
      pkg.name === '@shopify/cli-hydrogen'
    ) {
      pkgCmd = await getHydrogenUpgradeCommand({pkg});
    } else {
      pkgCmd = await getPackageUpgradeCommand({pkg});
    }

    cmd.dependencies.push(...pkgCmd.dependencies);
    cmd.devDependencies.push(...pkgCmd.devDependencies);
  }

  // adapt the upgrade command based on each package manager version
  switch (packageManager) {
    case 'npm':
      cmd.dependencies = ['npm', 'i', ...cmd.dependencies, '-P'];
      cmd.devDependencies = ['npm', 'i', '--save-dev', ...cmd.devDependencies];
      break;

    case 'yarn':
      cmd.dependencies = ['yarn', 'add', ...cmd.dependencies];
      cmd.devDependencies = ['yarn', 'add', '--dev', ...cmd.devDependencies];
      break;

    case 'pnpm':
      cmd.dependencies = ['pnpm', 'add', ...cmd.dependencies];
      cmd.devDependencies = [
        'pnpm',
        'add',
        '--save-dev',
        ...cmd.devDependencies,
      ];
      break;

    default:
      throw new Error(`Unsupported package manager: ${packageManager}`);
  }

  return cmd;
}

/**
 * Get the remix-run version to upgrade to based on the selected version
 * of the cli-hydrogen and hydrogen package dependencies
 * @returns Cmd
 **/
async function getRemixUpgradeCommand({pkg}: {pkg: PackageToUpgrade}): Promise<{
  dependencies: CmdArgs;
  devDependencies: CmdArgs;
}> {
  const {stdout: remixReactVersion} = await execa('npm', [
    'info',
    `${pkg.name}@${pkg.version}`,
    'peerDependencies.@remix-run/react',
  ]);

  const pinnedRemixReactVersion = remixReactVersion.startsWith('^')
    ? remixReactVersion.slice(1)
    : remixReactVersion;

  if (pkg.name === '@shopify/cli-hydrogen') {
    return {
      devDependencies: [`@remix-run/react@${pinnedRemixReactVersion}`],
      dependencies: [],
    };
  }

  if (pkg.name === '@shopify/hydrogen') {
    return {
      dependencies: [`@remix-run/react@${pinnedRemixReactVersion}`],
      devDependencies: [`@remix-run/dev@${pinnedRemixReactVersion}`],
    };
  }

  return {
    dependencies: [],
    devDependencies: [],
  };
}

/**
 * Get the hydrogen and cli-hydrogen version to upgrade to and their remix-run
 * dependencies based on the selected version of the cli-hydrogen and hydrogen
 * package dependencies
 * @param pkg - The package to upgrade
 * @returns Cmd
 **/
async function getHydrogenUpgradeCommand({
  pkg,
}: {
  pkg: PackageToUpgrade;
}): Promise<Cmd> {
  const remix = await getRemixUpgradeCommand({pkg});

  const pkgName = `${pkg.name}@${pkg.version}`;
  if (pkg.name === '@shopify/cli-hydrogen') {
    return {
      dependencies: remix.dependencies,
      devDependencies: [pkgName, ...remix.devDependencies],
    };
  }

  if (pkg.name === '@shopify/hydrogen') {
    return {
      dependencies: [pkgName, ...remix.dependencies],
      devDependencies: remix.devDependencies,
    };
  }

  throw new Error(`Unsupported package: ${pkg.name}`);
}

/**
 * Get the generic package upgrade command for any non hydrogen or cli-hydrogen
 * packages to upgrade
 * @param pkg - The package to upgrade
 * @returns Cmd
 **/
async function getPackageUpgradeCommand({pkg}: {pkg: PackageToUpgrade}) {
  let cmd: Cmd = {
    dependencies: [],
    devDependencies: [],
  };

  if (pkg.type === 'dependency') {
    cmd.dependencies.push(`${pkg.name}@${pkg.version}`);
  } else {
    cmd.devDependencies.push(`${pkg.name}@${pkg.version}`);
  }
  return cmd;
}

/**
 * Prepend the skip choice to the list of choices in a prompt
 * @param choices - The choices to prepend the skip choice to
 * @returns Choice<string>[]
 **/
function withSkipChoice(choices: Choice<string>[]) {
  const skipChoice = {
    value: 'skip',
    label: "Don't upgrade",
  };

  return [skipChoice, ...choices];
}

/**
 * Utility function to prompt the user to upgrade a dependency
 * @param dependency - The dependency to upgrade
 * @param name - The name of the dependency
 * @returns Promise<null | PackageToUpgrade>
 **/
function _promptDependencyUpdate(timeAgo: TimeAgo) {
  return async function promptDependencyUpdate({
    dependency,
    name,
    minVersion,
  }: {
    dependency: string | undefined;
    name: SupportedPackage;
    minVersion?: string | null;
  }): Promise<null | PackageToUpgrade> {
    if (!dependency) {
      return null;
    }

    const currentVersion = dependency?.replace(/^[\^~]/, '');

    if (!currentVersion) {
      return null;
    }

    // get all versions available
    const {stdout: _allVersions} = await execa('npm', [
      'view',
      name,
      'time',
      '--json',
    ]);

    const allVersions = JSON.parse(_allVersions) as string[];

    type Version = {
      version: string;
      date: string;
    };

    // filter out alpha versions and versions older than current version
    const upgradeableReleases = Object.keys(allVersions).reduce(
      (acc, version: string) => {
        // @ts-ignore
        const date = allVersions[version];
        const isCalver = /^\d{4}\.\d{2}\.\d{2}$/.test(version);
        const isSemver = Boolean(semver.valid(version) && !isCalver);

        const isOlderVersion = isSemver
          ? minVersion
            ? semver.lte(version, minVersion)
            : semver.lte(version, currentVersion)
          : isCalver
          ? minVersion
            ? version < minVersion
            : version < currentVersion
          : version < currentVersion;

        // filter out
        if (
          version.includes('created') ||
          version.includes('modified') ||
          isOlderVersion
        ) {
          return acc;
        }

        return [
          ...acc,
          {
            version,
            date: timeAgo.format(new Date(date)),
          } as Version,
        ];
      },
      [] as Version[],
    );

    if (
      typeof upgradeableReleases === 'undefined' ||
      !upgradeableReleases.length
    ) {
      return null;
    }

    const choices = withSkipChoice(
      upgradeableReleases.map((release) => {
        const {version, date} = release;

        const isCalverRelease = /([12][0-9]{3}\.[0-9])/.test(version);
        const group = isCalverRelease
          ? /([12][0-9]{3}\.[0-9])/.exec(version)?.[1] ?? ''
          : // is semver release
            /([0-9]+\.)/.exec(version)?.[1] ?? '';

        return {
          value: version,
          group,
          label: `${version} (${date})`,
          // label: `https://github.com/Shopify/hydrogen/releases/tag/${encodeURI(
          //   `${name}@${version}`,
          // )}`,
        };
      }),
    );

    // @ts-expect-error we are checking this is defined above
    const defaultChoice = upgradeableReleases[0].version;

    const selectedVersion = await renderSelectPrompt({
      message: `Select the ${name} version to upgrade to: (current ${currentVersion})`,
      choices,
      defaultValue: defaultChoice,
    });

    if (selectedVersion === 'skip') {
      return null;
    }

    const type = getDependencyType(name);

    return {
      version: selectedVersion,
      name,
      type,
    };
  };
}

/**
 * Returns the dependency type for a given upgradable package
 * @param packageName - The package name
 * @returns The dependency type
 * @throws If the package name is unknown
 * @example
 * ```ts
 * const type = getDependencyType('@shopify/hydrogen');
 * // type === 'dependency' | 'devDependency'
 * ```
 */
function getDependencyType(packageName: SupportedPackage) {
  switch (packageName) {
    case '@shopify/hydrogen':
    case '@shopify/remix-oxygen':
      return 'dependency';

    case '@shopify/oxygen-workers-types':
    case '@shopify/cli-hydrogen':
    case '@shopify/cli':
    case '@shopify/prettier-config':
      return 'devDependency';

    default:
      throw new Error(`Unknown package ${packageName}`);
  }
}

/**
 * Returns the dependencies for a given package.json
 * @param packageJsonPath - Path to the package.json
 * @returns The dependencies, devDependencies and peerDependencies
 * @throws If the package.json cannot be read
 * @example
 * ```ts
 * const {
 *  dependencies,
 *  devDependencies,
 *  peerDependencies
 * } = await getProjectDependencies({ packageJsonPath: './package.json' });
 * ```
 */
async function getProjectDependencies({
  packageJsonPath,
}: {
  packageJsonPath: string;
}) {
  const packageJson = JSON.parse(await readFile(packageJsonPath));

  const dependencies: Dependencies = packageJson.dependencies || {};
  const devDependencies: Dependencies = packageJson.devDependencies || {};
  const peerDependencies: Dependencies = packageJson.peerDependencies || {};

  return {
    dependencies,
    devDependencies,
    peerDependencies,
  };
}

/**
 * Perform the actual npm, yarn, or pnpm upgrade tasks of the selected packages
 * @param cmd - The command to run
 * @param appPath - Path to the Hydrogen app
 * @returns void
 */
async function upgradePackages({cmd, appPath}: {cmd: Cmd; appPath: string}) {
  let tasks = [
    {
      title: 'Upgrading dependencies. This could take a few minutes',
      task: async () => {
        try {
          await execa(
            cmd.dependencies[0] as string,
            cmd.dependencies.slice(1),
            {
              cwd: appPath,
            },
          );
        } catch (error) {
          let message = '';

          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          } else {
            message = 'Unknown error';
          }

          throw new Error(message);
        }
      },
    },
    {
      title: 'Upgrading devDependencies. This could take a few minutes',
      task: async () => {
        try {
          await execa(
            cmd.devDependencies[0] as string,
            cmd.devDependencies.slice(1),
            {
              cwd: appPath,
            },
          );
        } catch (error) {
          let message = '';

          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          } else {
            message = 'Unknown error';
          }
          throw new Error(message);
        }
      },
    },
  ];

  await renderTasks(tasks);
}
