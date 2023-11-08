import semver from 'semver';
import path from 'path';
import {Flags} from '@oclif/core';
import {isClean, ensureInsideGitDirectory} from '@shopify/cli-kit/node/git';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderConfirmationPrompt,
  renderError,
  renderFatalError,
  renderInfo,
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {
  fileExists,
  isDirectory,
  mkdir,
  removeFile,
  touchFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {
  getDependencies,
  installNodeModules,
  getPackageManager,
} from '@shopify/cli-kit/node/node-package-manager';
import {commonFlags} from '../../lib/flags.js';
import {readFile} from '@shopify/cli-kit/node/fs';
import {PackageJson} from 'type-fest';
import {getProjectPaths} from '../../lib/remix-config.js';

export type Dependencies = Record<string, string>;

export type Choice<T> = {
  label: string;
  value: T;
  key?: string;
  group?: string;
  helperText?: string;
};

export type SupportedPackage =
  | '@shopify/hydrogen'
  | '@shopify/cli-hydrogen'
  | '@shopify/remix-oxygen';

export type PackageToUpgrade = {
  version: string;
  name: SupportedPackage;
  type: 'dependency' | 'devDependency';
};

type Step = {
  code: string;
  file?: string;
  info?: string;
  reel?: string;
  title: string;
};

export type ReleaseItem = {
  breaking?: boolean;
  docs?: string;
  id: string | null;
  info?: string;
  pr: `https://${string}` | null;
  steps?: Array<Step>;
  title: string;
};

export type Release = {
  commit: `https://${string}`;
  date: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  features: Array<ReleaseItem>;
  fixes: Array<ReleaseItem>;
  hash: string;
  pr: `https://${string}`;
  title: string;
  version: string;
};

export type ChangeLog = {
  url: string;
  releases: Array<Release>;
  version: string;
};

export type CummulativeRelease = {
  features: Array<ReleaseItem>;
  fixes: Array<ReleaseItem>;
};

export default class Upgrade extends Command {
  static description = 'Upgrade Remix and Hydrogen npm dependencies.';

  static flags = {
    path: commonFlags.path,
    version: Flags.string({
      description: 'A target hydrogen version to update to',
      required: false,
      char: 'v',
    }),
    ['dry-run']: Flags.boolean({
      description:
        'Generate a summary and .md file with upgrade instructions without actually upgrading the dependencies',
      required: false,
      default: false,
      char: 'd',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Upgrade);
    const appPath = flags.path ? path.resolve(flags.path) : process.cwd();
    const version = flags.version;
    const dryRun = Boolean(flags['dry-run']);
    await runUpgrade({appPath, version, dryRun});
  }
}

let CACHED_CHANGELOG: ChangeLog | null = null;

export async function runUpgrade({
  appPath,
  dryRun,
  version: targetVersion,
}: {
  appPath: string;
  dryRun: boolean;
  version?: string;
}) {
  await checkIsGitRepo(appPath);

  await checkDirtyGitBranch(appPath);

  const current = await getHydrogenVersion({appPath});

  if (!current?.currentVersion) {
    throw new Error('Failed to get current Hydrogen version');
  }

  const {currentVersion, currentDependencies} = current;

  // TODO: swap when we merge to production
  // const snapshots = await fetchChangelog();
  const changelog = await fetchTempChangelog();

  const {availableUpgrades} = getAvailableUpgrades({
    releases: changelog.releases,
    currentVersion,
  });

  if (!availableUpgrades?.length) {
    const upToDateMessage = `You are on the latest Hydrogen version: ${getAbsoluteVersion(
      currentVersion,
    )}`;

    renderSuccess({headline: upToDateMessage});

    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }

    return;
  }

  // Prompt the user to select a version from the list of available upgrades
  const selectedRelease = await getSelectedRelease({
    currentVersion,
    targetVersion,
    availableUpgrades,
  });

  if (!selectedRelease) {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'No Hydrogen version selected',
      tryMessage: `Please try again later`,
    });

    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }

    return;
  }

  // Get an aggregate list of features and fixes included in the upgrade versions range
  const cumulativeRelease = getCummulativeRelease({
    releases: changelog.releases,
    currentVersion,
    selectedRelease,
  });

  // Prompt the user to confirm the upgrade and display a list of features and fixes
  await displayConfirmation({
    appPath,
    cumulativeRelease,
    dryRun,
    selectedRelease,
    targetVersion,
  });

  // skip the dependency upgrade step and validation if we're doing a dry run
  if (!dryRun) {
    await upgradeNodeModules({appPath, selectedRelease, currentDependencies});
    await validateUpgrade({
      appPath,
      selectedRelease,
    });
  }

  // Generate a markdown file with upgrade instructions
  const instrunctionsFilePath = await generateUpgradeInstructionsFile({
    appPath,
    cumulativeRelease,
    currentVersion,
    dryRun,
    selectedRelease,
  });

  // Display a summary of the upgrade and next steps
  await displaySummary({
    currentVersion,
    dryRun,
    instrunctionsFilePath,
    selectedRelease,
  });
}

/**
 * Checks if the target folder is a git repo and throws an error if it's not
 */
async function checkIsGitRepo(appPath: string) {
  try {
    await ensureInsideGitDirectory(appPath);
  } catch (error) {
    renderFatalError({
      name: 'error',
      type: 1,
      message: 'The upgrade command can only be run on a git repository',
      tryMessage: `Please run the command inside a git repository or run 'git init' to create one`,
    });
    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }
  }
}

/**
 * Checks if the current git branch is clean and throws an error if it's not
 */
async function checkDirtyGitBranch(appPath: string) {
  // TODO: remove type cast when we upgrade cli-kit to a version that includes https://github.com/Shopify/cli/pull/3022
  const cleanBranch = (await isClean(appPath)) as unknown as () => boolean;

  if (!cleanBranch()) {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'The upgrade command can only be run on a clean git branch',
      tryMessage: `Please commit your changes or re-run the command on a clean branch`,
    });
    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }
  }
}

/**
 * Gets the current @shopify/hydrogen version from the app's package.json
 */
export async function getHydrogenVersion({appPath}: {appPath: string}) {
  if (!appPath) {
    throw new Error('No app path provided');
  }

  const {root} = getProjectPaths(appPath);
  const packageJsonPath = path.join(root, 'package.json');

  const rawPackageJson = await readFile(packageJsonPath).catch(() => null);

  if (typeof rawPackageJson !== 'string') {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'Could not find a valid package.json',
      tryMessage: `Please make sure you are running the command in a npm project`,
    });

    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }

    return;
  }

  const packageJson = JSON.parse(rawPackageJson) as PackageJson;

  const currentDependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  } as Dependencies;

  const currentVersion = currentDependencies?.['@shopify/hydrogen'];

  if (!currentVersion) {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'Could not find a valid Hydrogen version in package.json',
      tryMessage: `Please make sure you are running the command in a Hydrogen project`,
    });

    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }
  }

  return {currentVersion, currentDependencies};
}

// /**
//  * Gets the current @shopify/hydrogen version from the app's package.json
//  */
// export async function getHydrogenVersion({appPath}: {appPath: string}) {
//   if (!appPath) {
//     throw new Error('No app path provided');
//   }
//
//   console.log('inside getHydrogenVersion');
//
//   const {root} = getProjectPaths(appPath);
//   const packageJsonPath = path.join(root, 'package.json');
//
//   if (!packageJsonPath) {
//     throw new Error('No package.json found');
//   }
//
//   const currentDependencies = await getDependencies(packageJsonPath);
//   const currentVersion = currentDependencies?.['@shopify/hydrogen'];
//
//   if (!currentVersion) {
//     throw new Error(
//       'The upgrade command can only be used in Hydrogen projects including @shopify/hydrogen as a dependency',
//     );
//   }
//
//   return {currentVersion, currentDependencies};
// }

/**
 * (Temp) Mock-fetches the changelog-versions.json while we merge
 */
export async function fetchTempChangelog(): Promise<ChangeLog> {
  return Promise.resolve(TEMP_CHANGELOG);
}

/**
 * Fetches the changelog.json file from the Hydrogen repo
 */
export async function fetchChangelog(): Promise<ChangeLog | undefined> {
  if (CACHED_CHANGELOG) {
    return CACHED_CHANGELOG;
  }
  try {
    const response = await fetch(
      // TODO: https://hydrogen.shopify.dev/changelong.json
      // NOTE: https://github.com/Shopify/hydrogen-shopify-dev/pull/154
      // NOTE: https://raw.githubusercontent.com/Shopify/hydrogen/main/changelog.json'
      'https://hydrogen.shopify.dev/changelog.json',
    );

    if (!response.ok) {
      throw new Error('Failed to fetch changelog.json');
    }

    const json = (await response.json()) as object;

    if ('releases' in json && 'url' in json) {
      CACHED_CHANGELOG = json as ChangeLog;
      return CACHED_CHANGELOG;
    }
  } catch (error) {
    renderFatalError({
      name: 'error',
      type: 0,
      message: 'Failed to fetch changelog',
      tryMessage: `Please try again later`,
    });

    if (!process.env.SHOPIFY_UNIT_TEST) {
      process.exit(0);
    }
  }
}

/**
 * Gets the list of available upgrades based on the current version
 */
export function getAvailableUpgrades({
  releases,
  currentVersion,
}: {
  releases: ChangeLog['releases'];
  currentVersion: string;
}) {
  const currentPinnedVersion = getAbsoluteVersion(currentVersion);
  let currentMajorVersion = '';

  const availableUpgrades = releases.filter((release) => {
    const isUpgrade = semver.gt(release.version, currentPinnedVersion);
    if (!isUpgrade) return false;
    if (currentMajorVersion !== release.version) {
      currentMajorVersion = release.version;
      return isUpgrade;
    }
    return false;
  }) as Array<Release>;

  const uniqueAvailableUpgrades = availableUpgrades.reduce((acc, release) => {
    if (acc[release.version]) return acc;
    acc[release.version] = release;
    return acc;
  }, {} as Record<string, Release>);

  return {availableUpgrades, uniqueAvailableUpgrades};
}

/**
 * Gets the selected release based on the --version flag or the user's prompt selection
 */
export async function getSelectedRelease({
  targetVersion,
  availableUpgrades: upgradesAvailable,
  currentVersion,
}: {
  targetVersion?: string;
  availableUpgrades: Array<Release>;
  currentVersion: string;
}) {
  let flagRelease; // holds a valid release based on the --version flag
  let selectedRelease = null;

  if (targetVersion) {
    flagRelease = upgradesAvailable.find((release) => {
      return (
        getAbsoluteVersion(release.version) ===
        getAbsoluteVersion(targetVersion)
      );
    });
  }

  if (flagRelease) {
    selectedRelease = flagRelease;
  } else {
    selectedRelease = await promptUpgradeOptions(
      currentVersion,
      upgradesAvailable,
    );
  }

  return selectedRelease;
}

/**
 * Gets an aggregate list of features and fixes included in the upgrade versions range
 */
export function getCummulativeRelease({
  releases,
  selectedRelease,
  currentVersion,
}: {
  releases: Array<Release>;
  selectedRelease: Release;
  currentVersion: string;
}): CummulativeRelease {
  const currentPinnedVersion = getAbsoluteVersion(currentVersion);

  const upgradingReleases = releases.filter((release) => {
    const isUpgrade =
      semver.gt(release.version, currentPinnedVersion) &&
      semver.lte(release.version, selectedRelease.version);

    if (!isUpgrade) return false;

    return true;
  });

  return upgradingReleases.reduce(
    (acc, release) => {
      acc.features = [...acc.features, ...release.features];
      acc.fixes = [...acc.fixes, ...release.fixes];
      return acc;
    },
    {features: [], fixes: []} as CummulativeRelease,
  );
}

/**
 * Displays a confirmation prompt to the user with a list of features and fixes
 * included in the upgrade versions range. The user can also return to the
 * version selection prompt if they want to choose a different version.
 **/
export async function displayConfirmation({
  appPath,
  cumulativeRelease,
  selectedRelease,
  targetVersion,
  dryRun,
}: {
  appPath: string;
  cumulativeRelease: CummulativeRelease;
  selectedRelease: Release;
  targetVersion?: string;
  dryRun: boolean;
}) {
  const {features, fixes} = cumulativeRelease;
  if (features.length || fixes.length) {
    renderInfo({
      headline: `Included in this upgrade:`,
      //@ts-ignore we know that filter(Boolean) will always return an array
      customSections: [
        features.length && {
          title: 'Features',
          body: [
            {
              list: {
                items: features.map((item) => item.title),
              },
            },
          ],
        },
        fixes.length && {
          title: 'Fixes',
          body: [
            {
              list: {
                items: fixes.map((item) => item.title),
              },
            },
          ],
        },
      ].filter(Boolean),
    });
  }

  const confirmedUpgrade = await renderConfirmationPrompt({
    message: `Are you sure you want to upgrade to ${selectedRelease.version}?`,
    cancellationMessage: `No, choose another version`,
    defaultValue: true,
  });

  if (!confirmedUpgrade) {
    // Go back to the version selection prompt
    return await runUpgrade({
      appPath,
      dryRun,
      version: targetVersion,
    });
  }
}

function isRemixDependency([name]: [string, string]) {
  if (name.includes('@remix-run')) {
    return true;
  }
  return false;
}

/**
 * Builds the arguments for the `npm|yarn|pnpm install` command
 */
export function buildUpgradeCommandArgs({
  selectedRelease,
  currentDependencies,
}: {
  selectedRelease: Release;
  currentDependencies: Dependencies;
}) {
  const args: string[] = [];

  // upgrade dependencies
  for (const [name, version] of Object.entries(selectedRelease.dependencies)) {
    const isRemixPackage = isRemixDependency([name, version]);
    const dependencyExists = currentDependencies[name];
    if (isRemixPackage || !dependencyExists) continue;
    args.push(`${name}@${getAbsoluteVersion(version)}`);
  }

  // upgrade devDependencies
  for (const [name, version] of Object.entries(
    selectedRelease.devDependencies,
  )) {
    const isRemixPackage = isRemixDependency([name, version]);
    const dependencyExists = currentDependencies[name];
    if (isRemixPackage || !dependencyExists) continue;
    args.push(`${name}@${getAbsoluteVersion(version)}`);
  }

  // Maybe upgrade Remix dependencies
  const currentRemix =
    Object.entries(currentDependencies).find(isRemixDependency);
  const selectedRemix = Object.entries(selectedRelease.dependencies).find(
    isRemixDependency,
  );

  if (currentRemix && selectedRemix) {
    const shouldUpgradeRemix = semver.lt(
      getAbsoluteVersion(currentRemix[1]),
      getAbsoluteVersion(selectedRemix[1]),
    );

    if (shouldUpgradeRemix) {
      args.push(
        ...appendRemixDependencies({currentDependencies, selectedRemix}),
      );
    }
  }

  return args;
}

/**
 * Installs the new Hydrogen dependencies
 */
export async function upgradeNodeModules({
  appPath,
  selectedRelease,
  currentDependencies,
}: {
  appPath: string;
  selectedRelease: Release;
  currentDependencies: Dependencies;
}) {
  await renderTasks(
    [
      {
        title: `Upgrading dependencies`,
        task: async () => {
          await installNodeModules({
            directory: appPath,
            packageManager: await getPackageManager(appPath),
            args: buildUpgradeCommandArgs({
              selectedRelease,
              currentDependencies,
            }),
          });
        },
      },
    ],
    {},
  );
}

/**
 * Appends the current @remix-run dependencies to the upgrade command
 */
function appendRemixDependencies({
  currentDependencies,
  selectedRemix,
}: {
  currentDependencies: Dependencies;
  selectedRemix: [string, string];
}) {
  const command: string[] = [];
  for (const [name, version] of Object.entries(currentDependencies)) {
    const isRemixPackage = isRemixDependency([name, version]);
    if (!isRemixPackage) {
      continue;
    }
    command.push(`${name}@${getAbsoluteVersion(selectedRemix[1])}`);
  }
  return command;
}

/**
 * Gets the absolute version from a pinned or unpinned version
 */
export function getAbsoluteVersion(version: string) {
  const isPinned = /^[\d\.]+$/.test(version);
  const currentPinnedVersion = isPinned ? version : version.slice(1);
  return currentPinnedVersion;
}

/**
 * Prompts the user to select a version from the list of available upgrades
 */
async function promptUpgradeOptions(
  currentVersion: string,
  upgradesAvailable: Array<Release>,
) {
  if (!upgradesAvailable?.length) {
    return null;
  }

  // Build the list of upgrade options to display to the user
  const choices = upgradesAvailable.map((release, index) => {
    const {version, title} = release;
    let isLatest = false;

    if (index === 0) {
      isLatest = true;
    }

    const majorVersion = `${semver.major(version)}.${semver.minor(version)}`;

    const isFirstMajorVersion = semver.patch(version) === 0;

    return {
      // group: majorVersion,
      label: `${version} ${
        isLatest ? '(latest)' : isFirstMajorVersion ? '(major)' : ''
      } - ${title}`,
      value: version,
    };
  }) as Array<Choice<string>>;

  if (!choices[0] || !choices[0].value) {
    return null;
  }

  const latestVersion = choices[0].value;

  const selectedVersion = await renderSelectPrompt({
    message: `Available Hydrogen versions (current: ${currentVersion})`,
    choices: choices,
    defaultValue: latestVersion,
  });

  const selectedRelease = upgradesAvailable.find(
    (release) => release.version === selectedVersion,
  );

  if (!selectedRelease) {
    throw new Error('No version selected');
  }

  return selectedRelease;
}

/**
 * Displays a summary of the upgrade and next steps
 */
async function displaySummary({
  currentVersion,
  dryRun,
  selectedRelease,
  instrunctionsFilePath,
}: {
  currentVersion: string;
  dryRun: boolean;
  selectedRelease: Release;
  instrunctionsFilePath?: string;
}) {
  const updatedDependenciesList = [
    ...Object.entries(selectedRelease.dependencies || {}).map(
      ([name, version]) => `${name}@${version}`,
    ),
    ...Object.entries(selectedRelease.devDependencies || {}).map(
      ([name, version]) => `${name}@${version}`,
    ),
  ];

  let nextSteps = [];

  if (typeof instrunctionsFilePath === 'string') {
    let instructions = `Upgrade instructions created at:\nfile://${instrunctionsFilePath}`;
    nextSteps.push(instructions);
  }

  const releaseNotesUrl = `https://hydrogen.shopify.dev/releases/${selectedRelease.version}`;

  nextSteps.push(`Release notes:\n${releaseNotesUrl}`);

  const versionsChange = `${getAbsoluteVersion(
    currentVersion,
  )} → ${getAbsoluteVersion(`${selectedRelease.version}`)}`;

  const headline = dryRun
    ? `Expected upgrade from ${versionsChange}`
    : `You've have updated from ${versionsChange}`;

  return renderSuccess({
    headline,
    customSections: [
      {
        title: 'Updated dependencies',
        body: [
          {
            list: {
              items: updatedDependenciesList,
            },
          },
        ],
      },
      {
        title: 'What’s next?',
        body: [
          {
            list: {
              items: nextSteps,
            },
          },
        ],
      },
    ].filter(Boolean),
  });
}

/**
 * Validate if a h2 upgrade was successful by comparing the previous and current
 * @shopify/hydrogen versions
 */
async function validateUpgrade({
  appPath,
  selectedRelease,
}: {
  appPath: string;
  selectedRelease: Release;
}) {
  const dependencies = await getDependencies(
    path.join(appPath, 'package.json'),
  );

  const updatedVersion = dependencies['@shopify/hydrogen'];

  if (!updatedVersion) {
    throw new Error('Hydrogen version not found in package.json');
  }

  const updatedPinnedVersion = getAbsoluteVersion(updatedVersion);

  if (updatedPinnedVersion !== selectedRelease.version) {
    renderError({
      headline: `Failed to upgrade to Hydrogen version ${selectedRelease.version}`,
      body: `You are still on version ${updatedPinnedVersion}`,
    });
    process.exit(0);
  }
}

/**
 * Generates markdown for a release item
 */
function generateStepMd(item: ReleaseItem) {
  const {steps} = item;
  const heading = `### ${item.title} [#${item.id}](${item.pr})\n`;
  const body = steps
    ?.map((step, stepIndex) => {
      const pr = item.pr ? `[#${item.id}](${item.pr})\n` : '';
      const multiStep = steps.length > 1;
      const title = multiStep
        ? `#### Step: ${stepIndex + 1}. ${step.title} ${pr}\n`
        : `#### ${step.title.trim()}\n`;
      const info = step.info ? `> ${step.info}\n` : '';
      const code = step.code ? `${Buffer.from(step.code, 'base64')}\n` : '';
      const docs = item.docs ? `[docs](${item.docs})\n` : '';
      return `${title}${info}${docs}${pr}${code}`;
    })
    .join('\n');
  return `${heading}\n${body}`;
}

/**
 * Generates a markdown file with upgrade instructions
 */
async function generateUpgradeInstructionsFile({
  appPath,
  cumulativeRelease,
  currentVersion,
  dryRun,
  selectedRelease,
}: {
  appPath: string;
  cumulativeRelease: CummulativeRelease;
  currentVersion: string;
  dryRun: boolean;
  selectedRelease: Release;
}) {
  let filename = '';

  const {featuresMd, breakingChangesMd} = cumulativeRelease.features
    .filter((feature) => feature.steps)
    .reduce(
      (acc, feature) => {
        if (feature.breaking) {
          acc.breakingChangesMd.push(generateStepMd(feature));
        } else {
          acc.featuresMd.push(generateStepMd(feature));
        }
        return acc;
      },
      {featuresMd: [], breakingChangesMd: []} as {
        featuresMd: string[];
        breakingChangesMd: string[];
      },
    );

  const fixesMd = cumulativeRelease.fixes
    .filter((fixes) => fixes.steps)
    .map(generateStepMd);

  if (!featuresMd.length && !fixesMd.length) {
    renderInfo({
      headline: `No upgrade instructions generated`,
      body: `There are no additional upgrade instructions for this version.`,
    });
    return;
  }

  const absoluteFrom = getAbsoluteVersion(currentVersion);
  const absoluteTo = getAbsoluteVersion(selectedRelease.version);
  filename = `${
    dryRun ? 'preview-' : ''
  }upgrade-${absoluteFrom}-to-${absoluteTo}.md`;

  const dotShopifyFolderPath = path.join(appPath, '.shopify/');

  const h1 = `# Hydrogen upgrade guide: ${absoluteFrom} to ${absoluteTo}`;

  let md = `${h1}\n\n----\n`;

  if (breakingChangesMd.length) {
    md += `\n## Breaking changes\n\n${breakingChangesMd.join('\n')}\n----\n`;
  }

  if (featuresMd.length) {
    md += `\n## Features\n\n${featuresMd.join('\n')}\n----\n`;
  }

  if (fixesMd.length) {
    md += `\n${featuresMd.length ? '----\n\n' : ''}## Fixes\n\n${fixesMd.join(
      '\n',
    )}`;
  }

  const filePath = path.join(dotShopifyFolderPath, filename);

  try {
    await isDirectory(dotShopifyFolderPath);
  } catch (error) {
    await mkdir(dotShopifyFolderPath);
  }

  if (!(await fileExists(filePath))) {
    await touchFile(filePath);
  } else {
    const overwriteMdFile = await renderConfirmationPrompt({
      message: `A previous upgrade instrunctions file already exists for this version.\nDo you want to overwrite it?`,
      defaultValue: false,
    });

    if (overwriteMdFile) {
      await removeFile(`${filePath}.old`);
    } else {
      return;
    }
    await touchFile(filePath);
  }

  await writeFile(filePath, md);

  return `.shopify/${filename}`;
}

/**
 * Displays a notice to the user if there are new Hydrogen versions available
 * This function is executed by the `dev` command
 */
export async function displayDevUpgradeNotice({
  targetPath,
}: {
  targetPath?: string;
}) {
  const appPath = targetPath ? path.resolve(targetPath) : process.cwd();
  const {currentVersion} = await getHydrogenVersion({appPath});

  const changelog = await fetchTempChangelog();

  if (!changelog?.releases) return;

  const {availableUpgrades, uniqueAvailableUpgrades} = getAvailableUpgrades({
    releases: changelog.releases,
    currentVersion,
  });

  if (!availableUpgrades?.length) {
    renderSuccess({
      headline: `You are on the latest Hydrogen version: ${getAbsoluteVersion(
        currentVersion,
      )}`,
    });
    return;
  }

  if (!availableUpgrades[0]?.version) {
    renderError({
      headline: `Failed to find the latest Hydrogen version`,
      body: `Please try again later`,
    });
    return;
  }

  const pinnedLatestVersion = getAbsoluteVersion(availableUpgrades[0].version);
  const pinnedCurrentVersion = getAbsoluteVersion(currentVersion);
  const currentReleaseIndex = changelog.releases.findIndex((release) => {
    const pinnedReleaseVersion = getAbsoluteVersion(release.version);
    return pinnedReleaseVersion === pinnedCurrentVersion;
  });

  const uniqueNextReleases = changelog.releases
    .slice(0, currentReleaseIndex)
    .reverse()
    .reduce((acc, release) => {
      if (acc[release.version]) return acc;
      acc[release.version] = release;
      return acc;
    }, {} as Record<string, Release>);

  const nextReleases = Object.keys(uniqueNextReleases).length
    ? Object.entries(uniqueNextReleases)
        .map(([version, release]) => {
          return `${version} - ${release.title}`;
        })
        .slice(0, 5)
    : [];

  let headline =
    Object.keys(uniqueAvailableUpgrades).length > 1
      ? `There are ${
          Object.keys(uniqueAvailableUpgrades).length
        } new @shopify/hydrogen versions available.`
      : `There's a new @shopify/hydrogen version available.`;

  renderInfo({
    headline,
    body: [`Current: ${currentVersion} | Latest: ${pinnedLatestVersion}`],
    //@ts-ignore will always be an array
    customSections: nextReleases.length
      ? [
          {
            title: `The next ${nextReleases.length} version(s) include`,
            body: [
              {
                list: {
                  items: [
                    ...nextReleases,
                    availableUpgrades.length > 5 && `...more`,
                  ]
                    .flat()
                    .filter(Boolean),
                },
              },
            ].filter(Boolean),
          },
          {
            title: 'Next steps',
            body: [
              {
                list: {
                  items: [
                    `Run \`h2 upgrade\` or \`h2 upgrade --version XXXX.X.XX\``,
                    ,
                    `Read release notes at https://hydrogen.shopify.dev/releases`,
                  ],
                },
              },
            ],
          },
        ]
      : [],
  });
}

/**
 * Temporary snapshot of the changelog.json file
 * Once we merge to production, we can remove this and use the fetchChangelog function
 */
const TEMP_CHANGELOG: ChangeLog = {
  url: 'https://github.com/Shopify/hydrogen/pulls?q=is%3Apr+is%3Aclosed+%5Bci%5D+release+in%3Atitle+is%3Amerged',
  version: '1',
  releases: [
    {
      title: 'Moved @remix-run/server-runtime to peer dependency',
      version: '2023.10.2',
      date: '',
      hash: '875d35f52fcfd8006e78217cfac0096122f98a54',
      pr: 'https://github.com/Shopify/hydrogen/pull/1486',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1486/commits/875d35f52fcfd8006e78217cfac0096122f98a54',
      dependencies: {
        '@remix-run/react': '2.1.0',
        '@shopify/cli-hydrogen': '^6.0.2',
        '@shopify/hydrogen': '^2023.10.2',
        '@shopify/remix-oxygen': '^2.0.1',
      },
      devDependencies: {
        '@remix-run/dev': '2.1.0',
        typescript: '^5.2.2',
      },
      fixes: [
        {
          title: 'Moved @remix-run/server-runtime to peer dependency',
          pr: 'https://github.com/Shopify/hydrogen/pull/1484',
          id: '1484',
        },
      ],
      features: [],
    },
    {
      title: 'Fix h2 init flow and SEO canonical tags',
      version: '2023.10.1',
      date: '',
      hash: '58e63ce4ebda28dedb82fd8e2b461927fee68fb3',
      pr: 'https://github.com/Shopify/hydrogen/pull/1479',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1453/commits/58e63ce4ebda28dedb82fd8e2b461927fee68fb3',
      dependencies: {
        '@remix-run/react': '2.1.0',
        '@shopify/cli-hydrogen': '^6.0.1',
        '@shopify/hydrogen': '^2023.10.1',
        '@shopify/remix-oxygen': '^2.0.0',
      },
      devDependencies: {
        '@remix-run/dev': '2.1.0',
        typescript: '^5.2.2',
      },
      fixes: [
        {
          title:
            'Fix Shopify login during the init flow where the process would just exit when awaiting for a keypress',
          pr: 'https://github.com/Shopify/hydrogen/pull/1481',
          id: '1481',
        },
        {
          title: 'Removed URL params from canonical tags in SEO component',
          pr: 'https://github.com/Shopify/hydrogen/pull/1478',
          id: '1478',
        },
      ],
      features: [],
    },
    {
      title:
        'Storefront API version 2023.10, Remix v2, Customer API client and more',
      version: '2023.10.0',
      date: '',
      hash: '2e4afc2f88a2ed2e280c8845bef7c037d453a28e',
      pr: 'https://github.com/Shopify/hydrogen/pull/1453',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1453/commits/2e4afc2f88a2ed2e280c8845bef7c037d453a28e',
      dependencies: {
        '@remix-run/react': '2.1.0',
        '@shopify/cli-hydrogen': '^6.0.0',
        '@shopify/hydrogen': '^2023.10.0',
        '@shopify/remix-oxygen': '^2.0.0',
      },
      devDependencies: {
        '@remix-run/dev': '2.1.0',
        typescript: '^5.2.2',
      },
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
          title:
            'Storefront client the default caching strategy has been updated ',
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
      ],
    },
    {
      title: 'Fix build dist package',
      version: '2023.7.13',
      date: '',
      hash: '8bc00c931c7c7a3a32b0f2b9d322c0c373f75240',
      pr: 'https://github.com/Shopify/hydrogen/pull/1452',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1452/commits/8bc00c931c7c7a3a32b0f2b9d322c0c373f75240',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.5.1',
        '@shopify/hydrogen': '^2023.7.13',
        '@shopify/remix-oxygen': '^1.1.8',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      fixes: [
        {
          title: 'Fix template dist package due to CI error',
          pr: 'https://github.com/Shopify/hydrogen/pull/1451',
          id: '1451',
        },
      ],
      features: [],
    },
    {
      title:
        'JSDoc support, `h2 debug cpu`, `withCache` support in debug-network, and more',
      version: '2023.7.12',
      date: '',
      hash: '40f7d0fbc295976d405e58b1cbed2fc11715ef1e',
      pr: 'https://github.com/Shopify/hydrogen/pull/1423',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1423/commits/40f7d0fbc295976d405e58b1cbed2fc11715ef1e',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.5.0',
        '@shopify/hydrogen': '^2023.7.12',
        '@shopify/remix-oxygen': '^1.1.8',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [
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
      fixes: [
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
      ],
    },
    {
      title: 'Increase dev request body size limit to 100mb',
      version: '2023.7.11',
      date: '',
      hash: '5188d86f18793d85af9a4e10a6c88700c24d946a',
      pr: 'https://github.com/Shopify/hydrogen/pull/1420',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1420/commits/5188d86f18793d85af9a4e10a6c88700c24d946a',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.4.3',
        '@shopify/hydrogen': '^2023.7.11',
        '@shopify/remix-oxygen': '^1.1.7',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [],
      fixes: [
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
    },
    {
      title: 'Improved error traces and redirect logic',
      version: '2023.7.10',
      date: '',
      hash: '45366a247a94044f037e55fae1f96987af0655ca',
      pr: 'https://github.com/Shopify/hydrogen/pull/1409',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1409/commits/45366a247a94044f037e55fae1f96987af0655ca',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.4.2',
        '@shopify/hydrogen': '^2023.7.10',
        '@shopify/remix-oxygen': '^1.1.6',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [],
      fixes: [
        {
          title:
            'Ensure `storefrontRedirect` fallback only redirects to relative URLs.',
          pr: 'https://github.com/Shopify/hydrogen/pull/1399',
          id: '1399',
        },
        {
          title:
            'Ensure that the `/discount?redirect=...` route only redirects to relative URLs.',
          pr: 'https://github.com/Shopify/hydrogen/pull/1399',
          id: '1399',
        },
        {
          title: 'Ensure Oxygen adapter logs stack traces in production.',
          pr: 'https://github.com/Shopify/hydrogen/pull/1393',
          id: '1393',
        },
      ],
    },
    {
      title: 'Remove duplicate network debug logs',
      version: '2023.7.9',
      date: '',
      hash: 'f244e4e47328c7082c3d7d2f7940eeb7f806f9ef',
      pr: 'https://github.com/Shopify/hydrogen/pull/1397',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1397/commits/f244e4e47328c7082c3d7d2f7940eeb7f806f9ef',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.4.1',
        '@shopify/hydrogen': '^2023.7.9',
        '@shopify/remix-oxygen': '^1.1.5',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      fixes: [
        {
          title: 'Enhancements to the deploy command',
          pr: 'https://github.com/Shopify/hydrogen/pull/1381',
          id: '1381',
        },
        {
          title: 'Prevent logging debug-network errors multiple times',
          pr: 'https://github.com/Shopify/hydrogen/pull/1400',
          id: '1400',
        },
      ],
      features: [],
    },
    {
      title:
        'Cart Optimistic UI helpers, improved lockfile validation, sourcemaps and  withCache type inference',
      version: '2023.7.9',
      date: '',
      hash: 'e15dd790e922d9e4befcca54fac0dad7344c481f',
      pr: 'https://github.com/Shopify/hydrogen/pull/1374',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1374/commits/e15dd790e922d9e4befcca54fac0dad7344c481f',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.4.0',
        '@shopify/hydrogen': '^2023.7.9',
        '@shopify/remix-oxygen': '^1.1.4',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [
        {
          title:
            'Allow generic inference in standalone usage of WithCache type',
          pr: 'https://github.com/Shopify/hydrogen/pull/1363',
          id: '1363',
        },
        {
          title:
            'Cart Optimistic UI helpers useOptimisticData and OptimisticInput',
          pr: 'https://github.com/Shopify/hydrogen/pull/1366',
          id: '1366',
        },
      ],
      fixes: [
        {
          title: 'Fix storefront sub request cache key',
          pr: 'https://github.com/Shopify/hydrogen/pull/1375',
          id: '1375',
        },
        {
          title: 'Fix Pagination component',
          pr: 'https://github.com/Shopify/hydrogen/pull/1362',
          id: '1362',
        },
        {
          title: 'Remove sourcemap annotations from client bundles',
          pr: 'https://github.com/Shopify/hydrogen/pull/1364',
          id: '1364',
        },
        {
          title: 'Build command throws error if no valid lockfile is found',
          pr: 'https://github.com/Shopify/hydrogen/pull/1370',
          info: 'This behavior can be disabled with the flag --no-lockfile-check, which might be useful in monorepos or other setups where the lockfile is not available in the project directory.',
          id: '1370',
        },
      ],
    },
    {
      title: 'Fixed bundle analysis',
      version: '2023.7.8',
      date: '2023-08-31 10:36:12 -0400',
      hash: '0fa2287310368ad421b95b580c6fa0cdd17b83f',
      pr: 'https://github.com/Shopify/hydrogen/pull/1359',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1359/commits/0fa2287310368ad421b95b580c6fa0cdd17b83f7',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.3.1',
        '@shopify/hydrogen': '^2023.7.8',
        '@shopify/remix-oxygen': '^1.1.4',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [],
      fixes: [
        {
          title: 'Backwards compatible bundle analysis',
          pr: 'https://github.com/Shopify/hydrogen/pull/1357',
          id: '1357',
        },
      ],
    },
    {
      title: 'Deploy command, Bundle Analysis, Worker dev server runtime',
      version: '2023.7.8',
      date: '2023-09-21 01:24:39 +0000',
      hash: 'c977f21860e86d6735493596ea7ec84f73fd1de0',
      pr: 'https://github.com/Shopify/hydrogen/pull/1335',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1335/commits/c977f21860e86d6735493596ea7ec84f73fd1de0',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.3.0',
        '@shopify/hydrogen': '^2023.7.8',
        '@shopify/remix-oxygen': '^1.1.4',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [
        {
          title: 'Adds worker-unstable flag',
          pr: 'https://github.com/Shopify/hydrogen/pull/1184',
          info: 'Add --worker-unstable flag to h2 dev and h2 preview commands. This flag enables the use of the new experimental worker runtime for local development, which is closer to Oxygen production than the current Node.js sandbox. Please report any issues you encounter with this flag.',
          id: '1184',
        },
        {
          title: 'Added deploy command',
          pr: 'https://github.com/Shopify/hydrogen/pull/1019',
          id: '1019',
        },
        {
          title: 'Added  magic cart and discount routes to skeleton',
          pr: 'https://github.com/Shopify/hydrogen/pull/1309',
          id: '1309',
        },
        {
          title: 'Added bundle analysis tool',
          pr: 'https://github.com/Shopify/hydrogen/pull/1306',
          info: "We've added a tool for analyzing bundle sizes. You should try to keep your worker bundle small. The larger it gets effects the cold startup time of your app. We now include client-bundle-analyzer.html and worker-bundle-analyzer.html files in the build output. Open these in your browser to view an interactive analysis of your bundles. The CLI output also includes links to each file. Hydrogen also fails to build if your bundle size is over 10 MB. This is because Oxygen only supports worker bundles less than 10 MB.",
          id: '1306',
        },
        {
          title: 'Generate sourcemaps by default',
          info: "Make sourcemaps to default be turned on. They were off to prevent sourcemaps leaking server code to the client. Oxygen now makes sure to not serve the sourcemaps, so it's okay to generate them. Also, when sourcemaps are present, we hope to enable sourcemapped stack traces in error logs on Oxygen.",
          pr: 'https://github.com/Shopify/hydrogen/pull/1339',
          id: '1339',
        },
      ],
      fixes: [
        {
          title: 'Enhanced h2 preview command',
          pr: 'https://github.com/Shopify/hydrogen/pull/1184',
          id: '1184',
        },
        {
          title: 'Raise the subrequest limit to 100 for development',
          pr: 'https://github.com/Shopify/hydrogen/pull/1348',
          id: '1348',
        },
      ],
    },
    {
      title: 'Server-side network requests debugger (unstable)',
      version: '2023.7.7',
      date: '2023-09-07 20:32:18 +00',
      hash: 'cfc6de7f9af9ed992577c10afaea4d422f276401',
      pr: 'https://github.com/Shopify/hydrogen/pull/1307',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1307/commits/cfc6de7f9af9ed992577c10afaea4d422f276401',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.2.3',
        '@shopify/hydrogen': '^2023.7.7',
        '@shopify/remix-oxygen': '^1.1.4',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [
        {
          title: 'Reduce project initialization time',
          pr: 'https://github.com/Shopify/hydrogen/pull/1272',
          id: '1272',
        },
        {
          title: 'Add server-side network requests debugger (unstable)',
          pr: 'https://github.com/Shopify/hydrogen/pull/1284',
          id: '1284',
          steps: [
            {
              title:
                'Update server.ts so that it also passes in waitUntil and env',
              file: 'server.ts',
              code: 'YGBgZGlmZgpjb25zdCBoYW5kbGVSZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdEhhbmRsZXIoewogICAgYnVpbGQ6IHJlbWl4QnVpbGQsCiAgICBtb2RlOiBwcm9jZXNzLmVudi5OT0RFX0VOViwKKyAgICBnZXRMb2FkQ29udGV4dDogKCkgPT4gKHtzZXNzaW9uLCBzdG9yZWZyb250LCBlbnYsIHdhaXRVbnRpbH0pLAp9KTsKYGBg',
              reel: '2023.7.7-1284-1.mp4',
            },
            {
              title: 'If using typescript, also update `remix.env.d.ts`',
              file: 'remix.env.d.ts',
              code: 'YGBgZGlmZgogIGRlY2xhcmUgbW9kdWxlICdAc2hvcGlmeS9yZW1peC1veHlnZW4nIHsKICAgIGV4cG9ydCBpbnRlcmZhY2UgQXBwTG9hZENvbnRleHQgeworICAgICBlbnY6IEVudjsKICAgICAgY2FydDogSHlkcm9nZW5DYXJ0OwogICAgICBzdG9yZWZyb250OiBTdG9yZWZyb250OwogICAgICBzZXNzaW9uOiBIeWRyb2dlblNlc3Npb247CisgICAgICB3YWl0VW50aWw6IEV4ZWN1dGlvbkNvbnRleHRbJ3dhaXRVbnRpbCddOwogICAgfQogIH0KYGBg',
              reel: '2023.7.7-1284-2.mp4',
            },
          ],
        },
      ],
      fixes: [],
    },
    {
      title: 'Improved stack traces and cookie token creation',
      version: '2023.7.6',
      date: '',
      hash: '8f7b03e5bc06e89288b572f5399b7da723a8383a',
      pr: 'https://github.com/Shopify/hydrogen/pull/1295',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1295/commits/8f7b03e5bc06e89288b572f5399b7da723a8383a',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.2.2',
        '@shopify/hydrogen': '^2023.7.6',
        '@shopify/remix-oxygen': '^1.1.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [],
      fixes: [
        {
          title: 'Fix error stack traces in development mode',
          pr: 'https://github.com/Shopify/hydrogen/pull/1297',
          id: '1297',
        },
        {
          title: 'Fix incorrect creation of cookie token',
          pr: 'https://github.com/Shopify/hydrogen/pull/1294',
          id: '1294',
        },
      ],
    },
    {
      title: 'Pagination component fixes',
      version: '2023.7.5',
      date: '',
      hash: '9bf4e4afcf86e961252135a7d45b5f19f9958d36',
      pr: 'https://github.com/Shopify/hydrogen/pull/1293',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1293/commits/9bf4e4afcf86e961252135a7d45b5f19f9958d36',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.2.1',
        '@shopify/hydrogen': '^2023.7.5',
        '@shopify/remix-oxygen': '^1.1.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      fixes: [
        {
          title:
            'Fix the Pagination component to reset internal state when the URL changes',
          pr: 'https://github.com/Shopify/hydrogen/pull/1291',
          id: '1291',
          steps: [
            {
              info: 'Update pageInfo in all pagination queries. Here is an example route with a pagination query',
              title: 'Add `startCursor` to the query pageInfo',
              code: 'YGBgZGlmZgpxdWVyeSBDb2xsZWN0aW9uRGV0YWlscyB7CiAgIGNvbGxlY3Rpb24oaGFuZGxlOiAkaGFuZGxlKSB7CiAgICAgLi4uCiAgICAgcGFnZUluZm8gewogICAgICAgaGFzUHJldmlvdXNQYWdlCiAgICAgICBoYXNOZXh0UGFnZQogICAgICAgaGFzTmV4dFBhZ2UKICAgICAgIGVuZEN1cnNvcgorICAgICAgc3RhcnRDdXJzb3IKICAgICB9CiAgIH0KfQpgYGA=',
              reel: '2023.7.5-1293-1.mp4',
              file: 'All files with pagination queries',
            },
          ],
        },
      ],
      features: [],
    },
    {
      title: 'Typescript 5, Content Security Policy',
      version: '2023.7.4',
      date: '',
      hash: '5d8550ee14ef3a72129b1a4d6aacb27629044071',
      pr: 'https://github.com/Shopify/hydrogen/pull/1263',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1263/commits/5d8550ee14ef3a72129b1a4d6aacb27629044071',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.2.1',
        '@shopify/hydrogen': '^2023.7.4',
        '@shopify/remix-oxygen': '^1.1.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [
        {
          title: 'Add TypeScript v5 compatibility',
          pr: 'https://github.com/Shopify/hydrogen/pull/1240',
          id: '1240',
          steps: [
            {
              title: 'Update typescript',
              info: 'If you have typescript as a dev dependency in your app, it is recommended to change its version as follows:',
              code: 'YGBgZGlmZgogICJkZXZEZXBlbmRlbmNpZXMiOiB7CiAgICAuLi4KLSAgICJ0eXBlc2NyaXB0IjogIl40LjkuNSIsCisgICAidHlwZXNjcmlwdCI6ICJeNS4yLjIiLAogIH0KfQpgYGA=',
              reel: '2023.7.1263-1.mp4',
              file: 'package.json',
            },
          ],
        },
        {
          title: 'Add Content Security Policy (CSP)',
          docs: 'https://shopify.dev/docs/custom-storefronts/hydrogen/content-security-policy',
          pr: 'https://github.com/Shopify/hydrogen/pull/1235',
          id: '1235',
        },
      ],
      fixes: [
        {
          title: 'Fix development server port',
          pr: 'https://github.com/Shopify/hydrogen/pull/1267',
          id: '1267',
        },
        {
          title: 'Add custom product paths to VariantSelector',
          pr: 'https://github.com/Shopify/hydrogen/pull/1271',
          id: '1271',
        },
      ],
    },
    {
      title: 'HMR & HDR, shouldRevalidate, Windows Codegen',
      version: '2023.7.3',
      date: '',
      hash: '695b145f95c50b1c9fece587a300c038995110ee',
      pr: 'https://github.com/Shopify/hydrogen/pull/1212',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1212/commits/695b145f95c50b1c9fece587a300c038995110ee',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.2.0',
        '@shopify/hydrogen': '^2023.7.3',
        '@shopify/remix-oxygen': '^1.1.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      features: [
        {
          breaking: true,
          title:
            'Support Hot Module Replacement (HMR) and Hot Data Revalidation (HDR)',
          pr: 'https://github.com/Shopify/hydrogen/pull/1187',
          id: '1187',
          steps: [
            {
              title: 'Enable the v2 dev server in remix.config.js',
              file: 'remix.config.js',
              code: 'YGBgZGlmZgpmdXR1cmU6IHsKKyB2Ml9kZXY6IHRydWUsCiAgdjJfbWV0YTogdHJ1ZSwKICB2Ml9oZWFkZXJzOiB0cnVlLAogIC8vIC4uLgp9CmBgYA==',
              reel: '2023.7.3-1187-1.mp4',
            },
            {
              title:
                "Add Remix `<LiveReload />` component if you don't have it to your `root.jsx` or `root.tsx` file",
              file: 'root.tsx',
              code: 'YGBgZGlmZgppbXBvcnQgewogIE91dGxldCwKICBTY3JpcHRzLAorIExpdmVSZWxvYWQsCiAgU2Nyb2xsUmVzdG9yYXRpb24sCn0gZnJvbSAnQHJlbWl4LXJ1bi9yZWFjdCc7CgovLyAuLi4KCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCgpIHsKICAvLyAuLi4KICByZXR1cm4gKAogICAgPGh0bWw+CiAgICAgIDxoZWFkPgogICAgICAgey8qIC4uLiAgKi99CiAgICAgIDwvaGVhZD4KICAgICAgPGJvZHk+CiAgICAgICAgPE91dGxldCAvPgogICAgICAgIDxTY3JvbGxSZXN0b3JhdGlvbiAvPgogICAgICAgIDxTY3JpcHRzIC8+CisgICAgICAgPExpdmVSZWxvYWQgLz4KICAgICAgPC9ib2R5PgogICAgPC9odG1sPgogICk7Cn0KCmV4cG9ydCBmdW5jdGlvbiBFcnJvckJvdW5kYXJ5KCkgewogIC8vIC4uLgogIHJldHVybiAoCiAgICA8aHRtbD4KICAgICAgPGhlYWQ+CiAgICAgICAgey8qIC4uLiAqL30KICAgICAgPC9oZWFkPgogICAgICA8Ym9keT4KICAgICAgICBFcnJvciEKICAgICAgICA8U2NyaXB0cyAvPgorICAgICAgIDxMaXZlUmVsb2FkIC8+CiAgICAgIDwvYm9keT4KICAgIDwvaHRtbD4KICApOwp9CmBgYA==',
              reel: '2023.7.3-1187-2.mp4',
            },
          ],
        },
        {
          title: 'Add shouldRevalidate to improve performance',
          pr: 'https://github.com/Shopify/hydrogen/pull/1237',
          id: '1237',
        },
        {
          title: 'Export the type CookieOptions from cartSetIdDefault',
          pr: 'https://github.com/Shopify/hydrogen/pull/1153',
          id: '1153',
        },
      ],
      fixes: [
        {
          title: 'Improve error handling',
          pr: 'https://github.com/Shopify/hydrogen/pull/1225',
          id: '1225',
        },
        {
          title: 'Fix GraphQL Codegen on Windows',
          pr: 'https://github.com/Shopify/hydrogen/pull/1253',
          id: '1253',
        },
      ],
    },
    {
      title: 'Fixed analytics, Updated types, Better error handling',
      version: '2023.7.2',
      date: '',
      hash: 'ede660217b469205c2022099e1c92081f17cb19d',
      pr: 'https://github.com/Shopify/hydrogen/pull/1188',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1188/commits/ede660217b469205c2022099e1c92081f17cb19d',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.1.2',
        '@shopify/hydrogen': '^2023.7.2',
        '@shopify/remix-oxygen': '^1.1.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      fixes: [
        {
          title: 'Update @shopify/oxygen-workers-types',
          pr: 'https://github.com/Shopify/hydrogen/pull/1208',
          id: '1208',
        },
        {
          title: 'Surface storefront api response errors',
          pr: 'https://github.com/Shopify/hydrogen/pull/1205',
          id: '1205',
        },
        {
          title: 'Fix demo-store analytics',
          pr: 'https://github.com/Shopify/hydrogen/pull/1177',
          id: '1177',
        },
      ],
      features: [],
    },
    {
      title: 'Remix 1.19.1, Skeleton fixes, Better warnings',
      version: '2023.7.1',
      date: '',
      hash: '20f4ef21e42c33e975641b263a5edc76c38491fe',
      pr: 'https://github.com/Shopify/hydrogen/pull/1170',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1170/commits/20f4ef21e42c33e975641b263a5edc76c38491fe',
      dependencies: {
        '@remix-run/react': '1.19.1',
        '@shopify/cli-hydrogen': '^5.1.1',
        '@shopify/hydrogen': '^2023.7.1',
        '@shopify/remix-oxygen': '^1.1.2',
      },
      devDependencies: {
        '@remix-run/dev': '1.19.1',
      },
      fixes: [
        {
          title:
            'Fix the starter template cart aside to cover everything on larger pages',
          pr: 'https://github.com/Shopify/hydrogen/pull/1163',
          id: '1163',
        },
        {
          title: 'Warn in development when Remix packages are out of sync',
          pr: 'https://github.com/Shopify/hydrogen/pull/1173',
          id: '1173',
        },
        {
          title:
            'Skip Oxygen requirement checks of remix.config.js when @shopify/remix-oxygen is not installed.',
          pr: 'https://github.com/Shopify/hydrogen/pull/1137',
          id: '1137',
        },
      ],
      features: [
        {
          title: 'Update to Remix v1.19.1',
          pr: 'https://github.com/Shopify/hydrogen/pull/1172',
          id: '1172',
          docs: 'https://github.com/remix-run/remix/releases/tag/remix%401.19.1',
        },
      ],
    },
    {
      title:
        'New CLI flow, Login/Logout commands, Auto-reload env vars and more',
      version: '2023.7.0',
      date: '',
      hash: 'ce199d5c47e4a27c779bd711ee619739019d74e7',
      pr: 'https://github.com/Shopify/hydrogen/pull/1152',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1152/commits/ce199d5c47e4a27c779bd711ee619739019d74e7',
      dependencies: {
        '@remix-run/react': '1.17.1',
        '@shopify/cli-hydrogen': '^5.1.0',
        '@shopify/hydrogen': '^2023.7.0',
        '@shopify/remix-oxygen': '^1.1.1',
      },
      devDependencies: {
        '@remix-run/dev': '1.17.1',
      },
      features: [
        {
          title:
            'Add @total-typescript/ts-reset to demo-store and skeleton templates',
          pr: 'https://github.com/Shopify/hydrogen/pull/1042',
          id: '1042',
        },
        {
          title: 'Reworked CLI scaffolding flow',
          info: 'The onboarding process when creating new Hydrogen apps has been reworked. Now you can: 1. Create a new Shopify storefront and connect it to the local project, or use Mock.shop. 2. Scaffold CSS strategies: Tailwind, CSS Modules, Vanilla Extract, PostCSS. Scaffold i18n strategies: subfolders, domains, subdomains. 3. Automatically generate core routes',
          pr: 'https://github.com/Shopify/hydrogen/pull/913',
          id: '913',
        },
        {
          title: 'Add login and logout commands',
          pr: 'https://github.com/Shopify/hydrogen/pull/1022',
          id: '1022',
        },
        {
          title: 'Auto-reload environment variables in the development server',
          pr: 'https://github.com/Shopify/hydrogen/pull/997',
          id: '997',
        },
        {
          title: 'Support creating new storefronts from the link command',
          pr: 'https://github.com/Shopify/hydrogen/pull/1022',
          id: '1022',
        },
        {
          title: 'Add CartForm and createCartHandler',
          pr: 'https://github.com/Shopify/hydrogen/pull/786',
          id: '786',
          docs: 'https://shopify.dev/docs/custom-storefronts/hydrogen/cart',
        },
        {
          title: 'Export useLoadScript',
          pr: 'https://github.com/Shopify/hydrogen/pull/1080',
          id: '1080',
          docs: 'https://shopify.dev/docs/api/hydrogen-react/2023-07/hooks/useloadscript',
        },
        {
          title: 'Add an example using the new Customer Account API',
          pr: 'https://github.com/Shopify/hydrogen/pull/1126',
          id: '1126',
          docs: 'https://shopify.dev/docs/api/customer',
        },
        {
          title:
            'Add a <VariantSelector> and get component to build product forms.',
          pr: 'https://github.com/Shopify/hydrogen/pull/1027',
          id: '1027',
          docs: 'https://gist.github.com/blittle/d9205d4ac72528005dc6f3104c328ecd',
        },
        {
          title:
            'Added getFirstAvailableVariant and getSelectedProductOptions helper functions',
          pr: 'https://github.com/Shopify/hydrogen/pull/1027',
          id: '1027',
          docs: 'https://gist.github.com/blittle/d9205d4ac72528005dc6f3104c328ecd',
        },
        {
          title: 'Stabilize Pagination and getPaginationVariables',
          pr: 'https://github.com/Shopify/hydrogen/pull/1129',
          id: '1129',
          steps: [
            {
              title:
                'Rename getPaginationVariables_unstable to getPaginationVariables',
              file: 'All files that use getPaginationVariables',
              code: 'YGBgZGlmZgotIGltcG9ydCB7Z2V0UGFnaW5hdGlvblZhcmlhYmxlc19fdW5zdGFibGV9IGZyb20gJ0BzaG9waWZ5L2h5ZHJvZ2VuJzsKKyBpbXBvcnQge2dldFBhZ2luYXRpb25WYXJpYWJsZXN9IGZyb20gJ0BzaG9waWZ5L2h5ZHJvZ2VuJzsKYGBg',
              reel: '2023.7.0-1129-1.mp4',
            },
            {
              title: 'Rename Pagination_unstable to Pagination',
              file: 'All files that use Pagination',
              code: 'YGBgZGlmZgotIGltcG9ydCB7UGFnaWF0aW5vbl9fdW5zdGFibGV9IGZyb20gJ0BzaG9waWZ5L2h5ZHJvZ2VuJzsKKyBpbXBvcnQge1BhZ2lhdGlub259IGZyb20gJ0BzaG9waWZ5L2h5ZHJvZ2VuJzsKYGBg',
              reel: '2023.7.0-1129-2.mp4',
            },
          ],
        },
        {
          title:
            'Add login and logout commands. Rework how other commands interact with auth',
          pr: 'https://github.com/Shopify/hydrogen/pull/1022',
          id: '1022',
        },
      ],
      fixes: [
        {
          title: 'Show error message when Hydrogen App isn’t installed',
          pr: 'https://github.com/Shopify/hydrogen/pull/1075',
          id: '1075',
        },
        {
          title: 'Improve warning and error format for known Hydrogen messages',
          pr: 'https://github.com/Shopify/hydrogen/pull/1093',
          id: '1093',
        },
        {
          title: 'Stabilize the createWithCache function',
          pr: 'https://github.com/Shopify/hydrogen/pull/1151',
          id: '1151',
          steps: [
            {
              title: 'Rename createWithCache_unstable to createWithCache',
              file: 'All files that use createWithCache',
              code: 'YGBgZGlmZgotIGltcG9ydCB7Y3JlYXRlV2l0aENhY2hlX3Vuc3RhYmxlfSBmcm9tICdAc2hvcGlmeS9oeWRyb2dlbic7CisgaW1wb3J0IHtjcmVhdGVXaXRoQ2FjaGV9IGZyb20gJ0BzaG9waWZ5L2h5ZHJvZ2VuJzsKYGBg',
              reel: '2023.7.0-1151-1.mp4',
            },
          ],
        },
      ],
    },
    {
      title: 'Fixes to --codegen and --sourcemap flags',
      version: '2023.4.6',
      date: '',
      hash: 'c6445ac572bba7006f0c90b99287701662fbffe7',
      pr: 'https://github.com/Shopify/hydrogen/pull/1020',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1020/commits/c6445ac572bba7006f0c90b99287701662fbffe7',
      dependencies: {
        '@remix-run/react': '1.17.1',
        '@shopify/cli-hydrogen': '^5.0.2',
        '@shopify/hydrogen': '^2023.4.6',
        '@shopify/remix-oxygen': '^1.1.1',
      },
      devDependencies: {
        '@remix-run/dev': '1.17.1',
      },
      fixes: [
        {
          title: 'Fix --sourcemap flag for build command',
          pr: 'https://github.com/Shopify/hydrogen/pull/1032',
          id: '1032',
        },
        {
          title: 'Fix dev --codegen-unstable flag',
          pr: 'https://github.com/Shopify/hydrogen/pull/1018',
          id: '1018',
        },
      ],
      features: [],
    },
    {
      title: 'Upgrade to Remix 1.17.1',
      version: '2023.4.5',
      date: '',
      hash: 'ab7501fb37c154fa4214542f6f0b37f987639de2',
      pr: 'https://github.com/Shopify/hydrogen/pull/1008',
      commit:
        'https://github.com/Shopify/hydrogen/pull/1008/commits/ab7501fb37c154fa4214542f6f0b37f987639de2',
      dependencies: {
        '@remix-run/react': '1.17.1',
        '@shopify/cli-hydrogen': '^5.0.1',
        '@shopify/hydrogen': '^2023.4.5',
        '@shopify/remix-oxygen': '^1.1.1',
      },
      devDependencies: {
        '@remix-run/dev': '1.17.1',
      },
      fixes: [],
      features: [
        {
          title: 'Upgrade Remix to 1.17.1',
          docs: 'https://github.com/remix-run/remix/releases/tag/remix%401.17.1',
          pr: null,
          id: null,
          steps: [
            {
              title:
                'When updating your app, remember to also update your Remix dependencies to 1.17.1 in your package.json file:',
              file: 'package.json',
              code: 'YGBgZGlmZgotIkByZW1peC1ydW4vcmVhY3QiOiAiMS4xNS4wIiwKKyJAcmVtaXgtcnVuL3JlYWN0IjogIjEuMTcuMSIsCgotIkByZW1peC1ydW4vZGV2IjogIjEuMTUuMCIsCi0iQHJlbWl4LXJ1bi9lc2xpbnQtY29uZmlnIjogIjEuMTUuMCIsCisiQHJlbWl4LXJ1bi9kZXYiOiAiMS4xNy4xIiwKKyJAcmVtaXgtcnVuL2VzbGludC1jb25maWciOiAiMS4xNy4xIiwKYGBg',
              reel: '2023.4.5-1008-1.mp4',
            },
          ],
        },
      ],
    },
    {
      title: 'Added /admin route, <ModelViewer> fix and --no-sourcemap flag',
      version: '2023.4.4',
      date: '',
      hash: 'f5f897ce72aac7bc205e917392a2f3c9f8a697a7',
      pr: 'https://github.com/Shopify/hydrogen/pull/947',
      commit:
        'https://github.com/Shopify/hydrogen/pull/947/commits/f5f897ce72aac7bc205e917392a2f3c9f8a697a7',
      dependencies: {
        '@remix-run/react': '1.15.0',
        '@shopify/cli-hydrogen': '^5.0.0',
        '@shopify/hydrogen': '^2023.4.4',
        '@shopify/remix-oxygen': '^1.1.0',
      },
      devDependencies: {
        '@remix-run/dev': '1.15.0',
      },
      fixes: [
        {
          title: 'Updates default powered-by header to Shopify, Hydrogen',
          pr: 'https://github.com/Shopify/hydrogen/pull/961',
          id: '961',
        },
        {
          title: 'Make storefrontApiVersion parameter optional',
          pr: 'https://github.com/Shopify/hydrogen/pull/984',
          id: '984',
        },
        {
          title: 'Fix <ModelViewer> to properly set className',
          pr: 'https://github.com/Shopify/hydrogen/pull/966',
          id: '966',
        },
        {
          title:
            'Skip reading and writing cache in sub-requests when the strategy is CacheNone',
          pr: 'https://github.com/Shopify/hydrogen/pull/964',
          id: '964',
        },
      ],
      features: [
        {
          title: 'Add a /admin route that redirects to the Shopify admin',
          pr: 'https://github.com/Shopify/hydrogen/pull/989',
          id: '989',
          steps: [
            {
              title:
                'This redirect can be disabled by passing noAdminRedirect: true to storefrontRedirect',
              code: 'YGBgZGlmZgpzdG9yZWZyb250UmVkaXJlY3QoewogIHJlZGlyZWN0LAogIHJlc3BvbnNlLAogIHN0b3JlZnJvbnQsCisgbm9BZG1pblJlZGlyZWN0OiB0cnVlLAp9KTsKYGBg',
              file: 'All files that use storefrontRedirect',
            },
          ],
        },
        {
          title:
            'Allow disabling sourcemaps with shopify hydrogen build --no-sourcemap',
          pr: 'https://github.com/Shopify/hydrogen/pull/975',
          id: '975',
        },
      ],
    },
    {
      title: 'Maintenance release',
      version: '2023.4.3',
      date: '',
      hash: 'b6a3d970d9ac0c604d5ec776e2924596eced61c4',
      pr: 'https://github.com/Shopify/hydrogen/pull/927',
      commit:
        'https://github.com/Shopify/hydrogen/pull/927/commits/b6a3d970d9ac0c604d5ec776e2924596eced61c4',
      dependencies: {
        '@remix-run/react': '1.15.0',
        '@shopify/cli': '3.45.0',
        '@shopify/cli-hydrogen': '^4.2.1',
        '@shopify/hydrogen': '^2023.4.3',
        '@shopify/remix-oxygen': '^1.0.7',
      },
      devDependencies: {
        '@remix-run/dev': '1.15.0',
      },
      fixes: [
        {
          title: 'Maintenance release',
          pr: 'https://github.com/Shopify/hydrogen/pull/926',
          id: '926',
        },
      ],
      features: [],
    },
    {
      title: 'Added GraphQL codegen, Pagination, BuyNowButton fixes',
      version: '2023.4.2',
      date: '',
      hash: '76b484139e8816e68cf3fb32329403fcee61cccf',
      pr: 'https://github.com/Shopify/hydrogen/pull/897',
      commit:
        'https://github.com/Shopify/hydrogen/pull/897/commits/76b484139e8816e68cf3fb32329403fcee61cccf',
      dependencies: {
        '@remix-run/react': '1.15.0',
        '@shopify/cli-hydrogen': '^4.2.0',
        '@shopify/hydrogen': '^2023.4.2',
        '@shopify/remix-oxygen': '^1.0.6',
      },
      devDependencies: {
        '@remix-run/dev': '1.15.0',
      },
      fixes: [
        {
          title:
            'Fix issue where the <BuyNowButton/> would incorrectly redirect to checkout',
          pr: 'https://github.com/Shopify/hydrogen/pull/827',
          id: '827',
        },
        {
          title: 'Fix the load more results button on the /search route',
          pr: 'https://github.com/Shopify/hydrogen/pull/909',
          id: '909',
        },
      ],
      features: [
        {
          title: 'Add UNSTABLE support for GraphQL Codegen',
          info: 'Add UNSTABLE support for GraphQL Codegen to automatically generate types for every Storefront API query in the project via @shopify/hydrogen-codegenj',
          pr: 'https://github.com/Shopify/hydrogen/pull/707',
          id: '707',
          docs: 'https://github.com/Shopify/hydrogen/pull/707',
        },
        {
          title:
            'Add command to list environments from a linked Hydrogen storefront',
          pr: 'https://github.com/Shopify/hydrogen/pull/889',
          id: '889',
        },
        {
          title: 'Auto-inject environment variables from a linked storefront',
          pr: 'https://github.com/Shopify/hydrogen/pull/861',
          id: '861',
        },
        {
          title:
            'Add a <Pagination__unstable> component and getPaginationVariables__unstable helper',
          pr: 'https://github.com/Shopify/hydrogen/pull/755',
          id: '755',
          docs: 'https://shopify.dev/docs/api/hydrogen/latest/components/pagination',
        },
        {
          title: 'Adds pagination support on /search results',
          pr: 'https://github.com/Shopify/hydrogen/pull/918',
          id: '918',
        },
      ],
    },
    {
      title: 'Added --debug flag, pull command, parseGid, Powered-By header',
      version: '2023.4.1',
      date: '',
      hash: 'dcfbb24c321b01ff80b11f1d0802457e17394c35',
      pr: 'https://github.com/Shopify/hydrogen/pull/817',
      commit:
        'https://github.com/Shopify/hydrogen/pull/817/commits/dcfbb24c321b01ff80b11f1d0802457e17394c35',
      dependencies: {
        '@remix-run/react': '1.15.0',
        '@shopify/cli-hydrogen': '^4.1.2',
        '@shopify/hydrogen': '^2023.4.1',
        '@shopify/remix-oxygen': '^1.0.6',
      },
      devDependencies: {
        '@remix-run/dev': '1.15.0',
      },
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
      ],
    },
    {
      title: 'Upgraded CLI dependencies',
      version: '2023.4.0',
      date: '',
      hash: 'c14dde60e76f7d3bdb582e6be64b64109921e4db',
      pr: 'https://github.com/Shopify/hydrogen/pull/754',
      commit:
        'https://github.com/Shopify/hydrogen/pull/754/commits/c14dde60e76f7d3bdb582e6be64b64109921e4db',
      dependencies: {
        '@remix-run/react': '1.15.0',
        '@shopify/cli-hydrogen': '^4.1.1',
        '@shopify/hydrogen': '^2023.4.0',
        '@shopify/remix-oxygen': '^1.0.5',
      },
      devDependencies: {
        '@remix-run/dev': '1.15.1',
      },
      features: [],
      fixes: [],
    },
    {
      title:
        'h2 alias, new CLI prompts, Remix future flags, SEO data generators',
      version: '2023.1.7',
      date: '',
      hash: 'd5f3e779e3ac7b22b78771dfb50f412c93a2d133',
      pr: 'https://github.com/Shopify/hydrogen/pull/727',
      commit:
        'https://github.com/Shopify/hydrogen/pull/727/commits/d5f3e779e3ac7b22b78771dfb50f412c93a2d133',
      dependencies: {
        '@remix-run/react': '1.15.0',
        '@shopify/cli-hydrogen': '^4.1.0',
        '@shopify/hydrogen': '^2023.1.7',
        '@shopify/remix-oxygen': '^1.0.5',
      },
      devDependencies: {
        '@remix-run/dev': '1.15.0',
      },
      fixes: [
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
      ],
      features: [
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
      ],
    },
    {
      title:
        'Upgrade to Remix 1.14.0, Cache-Control defaults, ShopPayButton, SEO config',
      version: '2023.1.6',
      date: '',
      hash: 'd5a7eeb659628254ee7ec4b35459cd9b3d52008f',
      pr: 'https://github.com/Shopify/hydrogen/pull/574',
      commit:
        'https://github.com/Shopify/hydrogen/pull/574/commits/d5a7eeb659628254ee7ec4b35459cd9b3d52008f',
      dependencies: {
        '@remix-run/react': '1.14.0',
        '@shopify/cli-hydrogen': '^4.0.9',
        '@shopify/hydrogen': '^2023.1.6',
        '@shopify/remix-oxygen': '^1.0.4',
      },
      devDependencies: {
        '@remix-run/dev': '1.14.0',
      },
      fixes: [
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
          title:
            'Added new loader API for setting SEO tags within route module',
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
    },
    {
      title: 'Improved error handling',
      version: '2023.1.5',
      date: '',
      hash: 'b38f68558f088533846f1cd27de2eb9a97e7e9e7',
      pr: 'https://github.com/Shopify/hydrogen/pull/565',
      commit:
        'https://github.com/Shopify/hydrogen/pull/565/commits/b38f68558f088533846f1cd27de2eb9a97e7e9e7',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.8',
        '@shopify/hydrogen': '^2023.1.5',
        '@shopify/remix-oxygen': '^1.0.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Improve rate limit error messages when creating new projects',
          pr: 'https://github.com/Shopify/hydrogen/pull/553',
          id: '553',
        },
        {
          title:
            'Show better errors when initial build fails, and recover when fixing it.',
          pr: 'https://github.com/Shopify/hydrogen/pull/514',
          id: '514',
        },
      ],
      features: [],
    },
    {
      title: 'Fix the latest tag release',
      version: '2023.1.5',
      date: '',
      hash: 'f2adc542e9ed00c113942597334f0e679a1176c8',
      pr: 'https://github.com/Shopify/hydrogen/pull/563',
      commit:
        'https://github.com/Shopify/hydrogen/pull/563/commits/f2adc542e9ed00c113942597334f0e679a1176c8',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.7',
        '@shopify/hydrogen': '^2023.1.5',
        '@shopify/remix-oxygen': '^1.0.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Fix the latest tag',
          pr: 'https://github.com/Shopify/hydrogen/pull/562',
          id: '562',
        },
      ],
      features: [],
    },
    {
      title: 'Use woff2 in onboarding routes, show available upgrades',
      version: '2023.1.4',
      date: '',
      hash: '41c7592eefded147a5b6f9c61f7f92e6e01e79eb',
      pr: 'https://github.com/Shopify/hydrogen/pull/556',
      commit:
        'https://github.com/Shopify/hydrogen/pull/556/commits/41c7592eefded147a5b6f9c61f7f92e6e01e79eb',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.7',
        '@shopify/hydrogen': '^2023.1.4',
        '@shopify/remix-oxygen': '^1.0.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Use woff2 format instead of ttf in onboarding routes',
          pr: 'https://github.com/Shopify/hydrogen/pull/538',
          id: '538',
        },
        {
          title: 'Show available upgrades for CLI when creating new projects',
          pr: 'https://github.com/Shopify/hydrogen/pull/518',
          id: '518',
        },
      ],
      features: [],
    },
    {
      title: 'Fix imports and improve onboarding styling',
      version: '2023.1.4',
      date: '',
      hash: 'bf1014339ad0e48e621ecf60ebde7cf81894eda6',
      pr: 'https://github.com/Shopify/hydrogen/pull/522',
      commit:
        'https://github.com/Shopify/hydrogen/pull/522/commits/bf1014339ad0e48e621ecf60ebde7cf81894eda6',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.6',
        '@shopify/hydrogen': '^2023.1.4',
        '@shopify/remix-oxygen': '^1.0.3',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Fix CLI flags for init command, and add --install-deps',
          pr: 'https://github.com/Shopify/hydrogen/pull/516',
          id: '516',
        },
        {
          title: 'Fix template imports to only reference @shopify/hydrogen',
          pr: 'https://github.com/Shopify/hydrogen/pull/523',
          id: '523',
        },
        {
          title: 'Improve onboarding style and links',
          pr: 'https://github.com/Shopify/hydrogen/pull/525',
          id: '525',
        },
      ],
      features: [],
    },
    {
      title: 'Fix missing assets in virtual routes',
      version: '2023.1.3',
      date: '',
      hash: '9e25ee653f6d76057bc9876eebbc5a58e711a25b',
      pr: 'https://github.com/Shopify/hydrogen/pull/504',
      commit:
        'https://github.com/Shopify/hydrogen/pull/504/commits/9e25ee653f6d76057bc9876eebbc5a58e711a25b',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.5',
        '@shopify/hydrogen': '^2023.1.3',
        '@shopify/remix-oxygen': '^1.0.2',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Fix missing assets in virtual routes.',
          pr: 'https://github.com/Shopify/hydrogen/pull/503',
          id: '503',
        },
      ],
      features: [],
    },
    {
      title: 'Improved Windows support, Send Hydrogen version in requests',
      version: '2023.1.3',
      date: '',
      hash: '5a178b6175e20ec1f92ad60e90f2c7293a0e065e',
      pr: 'https://github.com/Shopify/hydrogen/pull/481',
      commit:
        'https://github.com/Shopify/hydrogen/pull/481/commits/5a178b6175e20ec1f92ad60e90f2c7293a0e065e',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.4',
        '@shopify/hydrogen': '^2023.1.3',
        '@shopify/remix-oxygen': '^1.0.2',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title:
            'Fix pathnames in Windows when creating projects and generating routes',
          pr: 'https://github.com/Shopify/hydrogen/pull/495',
          id: '495',
        },
        {
          title: 'Send Hydrogen version in Storefront API requests',
          pr: 'https://github.com/Shopify/hydrogen/pull/471',
          id: '471',
        },
        {
          title: 'Fix default Storefront type in LoaderArgs',
          pr: 'https://github.com/Shopify/hydrogen/pull/496',
          id: '496',
        },
      ],
      features: [],
    },
    {
      title: 'Fix init flow on Windows',
      version: '2023.1.2',
      date: '',
      hash: '86b9cd9d6f80b804907c6c394970c43fe077a7e0',
      pr: 'https://github.com/Shopify/hydrogen/pull/479',
      commit:
        'https://github.com/Shopify/hydrogen/pull/479/commits/86b9cd9d6f80b804907c6c394970c43fe077a7e0',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.3',
        '@shopify/hydrogen': '^2023.1.2',
        '@shopify/remix-oxygen': '^1.0.2',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Fix initialization a new Hydrogen project on Windows',
          pr: 'https://github.com/Shopify/hydrogen/pull/478',
          id: '478',
        },
      ],
      features: [],
    },
    {
      title: 'Add license files and readmes for all packages',
      version: '2023.1.2',
      date: '',
      hash: '73e3ff46bad87d48e60609faeaa0e3c0b5a3c23b',
      pr: 'https://github.com/Shopify/hydrogen/pull/464',
      commit:
        'https://github.com/Shopify/hydrogen/pull/464/commits/73e3ff46bad87d48e60609faeaa0e3c0b5a3c23b',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.2',
        '@shopify/hydrogen': '^2023.1.2',
        '@shopify/remix-oxygen': '^1.0.2',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Add license files and readmes for all packages ',
          pr: 'https://github.com/Shopify/hydrogen/pull/463',
          id: '463',
        },
      ],
      features: [],
    },
    {
      title: 'Update dependencies',
      version: '2023.1.1',
      date: '',
      hash: '7dff568d84a0754fa8cc9f763b5deed259eb6841',
      pr: 'https://github.com/Shopify/hydrogen/pull/462',
      commit:
        'https://github.com/Shopify/hydrogen/pull/462/commits/7dff568d84a0754fa8cc9f763b5deed259eb6841',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.1',
        '@shopify/hydrogen': '^2023.1.1',
        '@shopify/remix-oxygen': '^1.0.1',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Update all dependencies',
          pr: 'https://github.com/Shopify/hydrogen/pull/461',
          id: '461',
        },
      ],
      features: [],
    },
    {
      title: 'Remix 1.12.0, New Onboarding flow, Cart and create-app',
      version: '2023.1.0',
      date: '',
      hash: 'a2130c7e0b9821d3830964177720a7574761d5ea',
      pr: 'https://github.com/Shopify/hydrogen/pull/445',
      commit:
        'https://github.com/Shopify/hydrogen/pull/445/commits/a2130c7e0b9821d3830964177720a7574761d5ea',
      dependencies: {
        '@remix-run/react': '1.12.0',
        '@shopify/cli-hydrogen': '^4.0.0',
        '@shopify/hydrogen': '^2023.1.0',
        '@shopify/remix-oxygen': '^1.0.0',
      },
      devDependencies: {
        '@remix-run/dev': '1.12.0',
      },
      fixes: [
        {
          title: 'Upgrade to Remix 1.12.0',
          pr: 'https://github.com/Shopify/h2/pull/371',
          id: '371',
        },
        {
          title:
            'Change environment variable names to use what Oxygen will populate',
          pr: 'https://github.com/Shopify/h2/pull/354',
          id: '354',
        },
        {
          title: 'Create onboarding virtual route',
          pr: 'https://github.com/Shopify/h2/pull/414',
          id: '414',
        },
        {
          title: 'Introduce create-app CLI package',
          pr: 'https://github.com/Shopify/h2/pull/397',
          id: '397',
        },
        {
          title: 'Improve the onboarding experience for the CLI',
          pr: null,
          id: null,
        },
        {
          title: 'Refactor the cart implementation',
          pr: 'https://github.com/Shopify/h2/pull/311',
          id: '311',
        },
        {
          title:
            'Use the new version of GraphiQL instead of GraphQL Playground',
          pr: 'https://github.com/Shopify/h2/pull/410',
          id: '410',
        },
        {
          title:
            'Add Hydrogen utils function and update demo store to send shopify analytics',
          pr: 'https://github.com/Shopify/h2/pull/376',
          id: '376',
        },
        {
          title:
            'Rename the notFoundMaybeRedirect utility to storefrontRedirect',
          pr: 'https://github.com/Shopify/h2/pull/362',
          id: '362',
        },
        {
          title: 'Use new versioning schema',
          pr: null,
          id: null,
        },
        {
          title: 'Initial release of @shopify/remix-oxygen',
          pr: null,
          id: null,
        },
      ],
      features: [],
    },
  ],
};
