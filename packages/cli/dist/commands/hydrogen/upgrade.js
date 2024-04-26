import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import semver from 'semver';
import cliTruncate from 'cli-truncate';
import { Flags } from '@oclif/core';
import { ensureInsideGitDirectory, isClean } from '@shopify/cli-kit/node/git';
import Command from '@shopify/cli-kit/node/base-command';
import { renderSuccess, renderInfo, renderConfirmationPrompt, renderTasks, renderSelectPrompt } from '@shopify/cli-kit/node/ui';
import { readFile, isDirectory, mkdir, fileExists, touchFile, removeFile, writeFile } from '@shopify/cli-kit/node/fs';
import { installNodeModules, getPackageManager, getDependencies } from '@shopify/cli-kit/node/node-package-manager';
import { AbortError } from '@shopify/cli-kit/node/error';
import { getCliCommand } from '../../lib/shell.js';
import { commonFlags, flagsToCamelObject } from '../../lib/flags.js';
import { getProjectPaths } from '../../lib/remix-config.js';

const INSTRUCTIONS_FOLDER = ".hydrogen";
class Upgrade extends Command {
  static descriptionWithMarkdown = "Upgrade Hydrogen project dependencies, preview features, fixes and breaking changes. The command also generates an instruction file for each upgrade.";
  static description = "Upgrade Remix and Hydrogen npm dependencies.";
  static flags = {
    ...commonFlags.path,
    version: Flags.string({
      description: "A target hydrogen version to update to",
      required: false,
      char: "v"
    }),
    force: Flags.boolean({
      description: "Ignore warnings and force the upgrade to the target version",
      env: "SHOPIFY_HYDROGEN_FLAG_FORCE",
      char: "f"
    })
  };
  async run() {
    const { flags } = await this.parse(Upgrade);
    await runUpgrade({
      ...flagsToCamelObject(flags),
      appPath: flags.path ? path.resolve(flags.path) : process.cwd()
    });
  }
}
let CACHED_CHANGELOG = null;
async function runUpgrade({
  appPath,
  version: targetVersion,
  force
}) {
  if (!force) {
    await checkIsGitRepo(appPath);
    await checkDirtyGitBranch(appPath);
  }
  const { currentVersion, currentDependencies } = await getHydrogenVersion({
    appPath
  });
  const isPrerelease = semver.prerelease(currentVersion);
  if (isPrerelease) {
    throw new AbortError(
      "The upgrade command cannot be run over a prerelease Hydrogen version"
    );
  }
  const changelog = await getChangelog();
  const { availableUpgrades } = getAvailableUpgrades({
    releases: changelog.releases,
    currentVersion,
    currentDependencies
  });
  if (!availableUpgrades?.length) {
    renderSuccess({
      headline: `You are on the latest Hydrogen version: ${getAbsoluteVersion(
        currentVersion
      )}`
    });
    return;
  }
  let confirmed = false;
  let selectedRelease = void 0;
  let cumulativeRelease = void 0;
  do {
    selectedRelease = await getSelectedRelease({
      currentVersion,
      targetVersion,
      availableUpgrades
    });
    cumulativeRelease = getCummulativeRelease({
      availableUpgrades,
      currentVersion,
      currentDependencies,
      selectedRelease
    });
    confirmed = await displayConfirmation({
      cumulativeRelease,
      selectedRelease
    });
  } while (!confirmed);
  const instrunctionsFilePathPromise = generateUpgradeInstructionsFile({
    appPath,
    cumulativeRelease,
    currentVersion,
    selectedRelease
  });
  await upgradeNodeModules({ appPath, selectedRelease, currentDependencies });
  await validateUpgrade({
    appPath,
    selectedRelease
  });
  const instrunctionsFilePath = await instrunctionsFilePathPromise;
  await displayUpgradeSummary({
    appPath,
    currentVersion,
    instrunctionsFilePath,
    selectedRelease
  });
}
function checkIsGitRepo(appPath) {
  return ensureInsideGitDirectory(appPath).catch(() => {
    throw new AbortError(
      "The upgrade command can only be run on a git repository",
      `Please run the command inside a git repository or run 'git init' to create one`
    );
  });
}
async function checkDirtyGitBranch(appPath) {
  if (!await isClean(appPath)) {
    throw new AbortError(
      "The upgrade command can only be run on a clean git branch",
      "Please commit your changes or re-run the command on a clean branch"
    );
  }
}
async function getHydrogenVersion({ appPath }) {
  const { root } = getProjectPaths(appPath);
  const packageJsonPath = path.join(root, "package.json");
  let packageJson;
  try {
    packageJson = JSON.parse(await readFile(packageJsonPath));
  } catch {
    throw new AbortError(
      "Could not find a valid package.json",
      "Please make sure you are running the command in a npm project"
    );
  }
  const currentDependencies = {
    ...packageJson.dependencies ?? {},
    ...packageJson.devDependencies ?? {}
  };
  const currentVersion = currentDependencies["@shopify/hydrogen"];
  if (!currentVersion) {
    throw new AbortError(
      "Could not find a valid Hydrogen version in package.json",
      "Please make sure you are running the command in a Hydrogen project"
    );
  }
  return { currentVersion, currentDependencies };
}
async function getChangelog() {
  if (CACHED_CHANGELOG)
    return CACHED_CHANGELOG;
  if (process.env.FORCE_CHANGELOG_SOURCE === "local" || process.env.FORCE_CHANGELOG_SOURCE !== "remote" && !!process.env.LOCAL_DEV) {
    const require2 = createRequire(import.meta.url);
    return require2(fileURLToPath(
      new URL("../../../../../docs/changelog.json", import.meta.url)
    ));
  }
  try {
    const response = await fetch("https://hydrogen.shopify.dev/changelog.json");
    if (!response.ok) {
      throw new Error("Failed to fetch changelog.json");
    }
    const json = await response.json();
    if ("releases" in json && "url" in json) {
      CACHED_CHANGELOG = json;
      return CACHED_CHANGELOG;
    }
  } catch {
  }
  throw new AbortError(
    "Failed to fetch changelog",
    "Ensure you have internet connection and try again"
  );
}
function hasOutdatedDependencies({
  release,
  currentDependencies
}) {
  return Object.entries(release.dependencies).some(([name, version]) => {
    const currentDependencyVersion = currentDependencies?.[name];
    if (!currentDependencyVersion)
      return false;
    const isDependencyOutdated = semver.gt(
      getAbsoluteVersion(version),
      getAbsoluteVersion(currentDependencyVersion)
    );
    return isDependencyOutdated;
  });
}
function isUpgradeableRelease({
  currentDependencies,
  currentPinnedVersion,
  release
}) {
  if (!currentDependencies)
    return false;
  const isHydrogenOutdated = semver.gt(release.version, currentPinnedVersion);
  if (isHydrogenOutdated)
    return true;
  const isCurrentHydrogen = getAbsoluteVersion(release.version) === currentPinnedVersion;
  if (!isCurrentHydrogen)
    return false;
  return hasOutdatedDependencies({ release, currentDependencies });
}
function getAvailableUpgrades({
  releases,
  currentVersion,
  currentDependencies
}) {
  const currentPinnedVersion = getAbsoluteVersion(currentVersion);
  let currentMajorVersion = "";
  const availableUpgrades = releases.filter((release) => {
    const isUpgradeable = isUpgradeableRelease({
      release,
      currentPinnedVersion,
      currentDependencies
    });
    if (!isUpgradeable)
      return false;
    if (currentMajorVersion !== release.version) {
      currentMajorVersion = release.version;
      return true;
    }
    return false;
  });
  const uniqueAvailableUpgrades = availableUpgrades.reduce((acc, release) => {
    if (acc[release.version])
      return acc;
    acc[release.version] = release;
    return acc;
  }, {});
  return { availableUpgrades, uniqueAvailableUpgrades };
}
async function getSelectedRelease({
  targetVersion,
  availableUpgrades,
  currentVersion
}) {
  const targetRelease = targetVersion ? availableUpgrades.find(
    (release) => getAbsoluteVersion(release.version) === getAbsoluteVersion(targetVersion)
  ) : void 0;
  return targetRelease ?? promptUpgradeOptions(currentVersion, availableUpgrades);
}
function getCummulativeRelease({
  availableUpgrades,
  selectedRelease,
  currentVersion,
  currentDependencies
}) {
  const currentPinnedVersion = getAbsoluteVersion(currentVersion);
  if (!availableUpgrades?.length) {
    return { features: [], fixes: [] };
  }
  const upgradingReleases = availableUpgrades.filter((release) => {
    const isHydrogenUpgrade = semver.gt(release.version, currentPinnedVersion) && semver.lte(release.version, selectedRelease.version);
    if (isHydrogenUpgrade)
      return true;
    const isSameHydrogenVersion = getAbsoluteVersion(release.version) === currentPinnedVersion;
    if (!isSameHydrogenVersion || !currentDependencies)
      return false;
    return hasOutdatedDependencies({ release, currentDependencies });
  });
  return upgradingReleases.reduce(
    (acc, release) => {
      acc.features = [...acc.features, ...release.features];
      acc.fixes = [...acc.fixes, ...release.fixes];
      return acc;
    },
    { features: [], fixes: [] }
  );
}
function displayConfirmation({
  cumulativeRelease,
  selectedRelease
}) {
  const { features, fixes } = cumulativeRelease;
  if (features.length || fixes.length) {
    renderInfo({
      headline: `Included in this upgrade:`,
      //@ts-ignore we know that filter(Boolean) will always return an array
      customSections: [
        features.length && {
          title: "Features",
          body: [
            {
              list: {
                items: features.map((item) => item.title)
              }
            }
          ]
        },
        fixes.length && {
          title: "Fixes",
          body: [
            {
              list: {
                items: fixes.map((item) => item.title)
              }
            }
          ]
        }
      ].filter(Boolean)
    });
  }
  return renderConfirmationPrompt({
    message: `Are you sure you want to upgrade to ${selectedRelease.version}?`,
    cancellationMessage: `No, choose another version`,
    defaultValue: true
  });
}
function isRemixDependency([name]) {
  if (name.includes("@remix-run")) {
    return true;
  }
  return false;
}
function maybeIncludeDependency({
  currentDependencies,
  dependency: [name, version],
  selectedRelease
}) {
  const existingDependencyVersion = currentDependencies[name];
  const isRemixPackage = isRemixDependency([name, version]);
  if (isRemixPackage)
    return false;
  const isNextVersion = existingDependencyVersion === "next";
  if (isNextVersion)
    return false;
  const depMeta = selectedRelease.dependenciesMeta?.[name];
  if (!depMeta)
    return true;
  const isRequired = Boolean(
    selectedRelease.dependenciesMeta?.[name]?.required
  );
  if (!isRequired)
    return false;
  if (!existingDependencyVersion)
    return true;
  const isOlderVersion = semver.lt(
    getAbsoluteVersion(existingDependencyVersion),
    getAbsoluteVersion(version)
  );
  if (isOlderVersion)
    return true;
  return false;
}
function buildUpgradeCommandArgs({
  selectedRelease,
  currentDependencies
}) {
  const args = [];
  for (const dependency of Object.entries(selectedRelease.dependencies)) {
    const shouldUpgradeDep = maybeIncludeDependency({
      currentDependencies,
      dependency,
      selectedRelease
    });
    if (!shouldUpgradeDep)
      continue;
    args.push(`${dependency[0]}@${getAbsoluteVersion(dependency[1])}`);
  }
  for (const dependency of Object.entries(selectedRelease.devDependencies)) {
    const shouldUpgradeDep = maybeIncludeDependency({
      currentDependencies,
      dependency,
      selectedRelease
    });
    if (!shouldUpgradeDep)
      continue;
    args.push(`${dependency[0]}@${getAbsoluteVersion(dependency[1])}`);
  }
  const currentRemix = Object.entries(currentDependencies).find(isRemixDependency);
  const selectedRemix = Object.entries(selectedRelease.dependencies).find(
    isRemixDependency
  );
  if (currentRemix && selectedRemix) {
    const shouldUpgradeRemix = semver.lt(
      getAbsoluteVersion(currentRemix[1]),
      getAbsoluteVersion(selectedRemix[1])
    );
    if (shouldUpgradeRemix) {
      args.push(
        ...appendRemixDependencies({ currentDependencies, selectedRemix })
      );
    }
  }
  return args;
}
async function upgradeNodeModules({
  appPath,
  selectedRelease,
  currentDependencies
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
              currentDependencies
            })
          });
        }
      }
    ],
    {}
  );
}
function appendRemixDependencies({
  currentDependencies,
  selectedRemix
}) {
  const command = [];
  for (const [name, version] of Object.entries(currentDependencies)) {
    const isRemixPackage = isRemixDependency([name, version]);
    if (!isRemixPackage) {
      continue;
    }
    command.push(`${name}@${getAbsoluteVersion(selectedRemix[1])}`);
  }
  return command;
}
function getAbsoluteVersion(version) {
  const result = semver.minVersion(version);
  if (!result) {
    throw new AbortError(`Invalid version: ${version}`);
  }
  return result.version;
}
async function promptUpgradeOptions(currentVersion, availableUpgrades) {
  if (!availableUpgrades?.length) {
    throw new AbortError("No upgrade options available");
  }
  const choices = availableUpgrades.map((release, index) => {
    const { version, title } = release;
    const tag = index === 0 ? "(latest)" : semver.patch(version) === 0 ? "(major)" : getAbsoluteVersion(currentVersion) === getAbsoluteVersion(version) ? "(outdated)" : "";
    `${semver.major(version)}.${semver.minor(version)}`;
    return {
      // group: majorVersion,
      label: `${version} ${tag} - ${cliTruncate(title, 54)}`,
      value: release
    };
  });
  return renderSelectPrompt({
    message: `Available Hydrogen versions (current: ${currentVersion})`,
    choices,
    defaultValue: choices[0]?.value
    // Latest version
  });
}
async function displayUpgradeSummary({
  appPath,
  currentVersion,
  selectedRelease,
  instrunctionsFilePath
}) {
  const updatedDependenciesList = [
    ...Object.entries(selectedRelease.dependencies || {}).map(
      ([name, version]) => `${name}@${version}`
    ),
    ...Object.entries(selectedRelease.devDependencies || {}).map(
      ([name, version]) => `${name}@${version}`
    )
  ];
  let nextSteps = [];
  if (typeof instrunctionsFilePath === "string") {
    let instructions = `Upgrade instructions created at:
file://${instrunctionsFilePath}`;
    nextSteps.push(instructions);
  }
  const releaseNotesUrl = `https://hydrogen.shopify.dev/releases/${selectedRelease.version}`;
  nextSteps.push(`Release notes:
${releaseNotesUrl}`);
  const currentPinnedVersion = getAbsoluteVersion(currentVersion);
  const selectedPinnedVersion = getAbsoluteVersion(selectedRelease.version);
  const upgradedDependenciesOnly = currentPinnedVersion === selectedPinnedVersion;
  const fromToMsg = `${currentPinnedVersion} \u2192 ${selectedPinnedVersion}`;
  const headline = upgradedDependenciesOnly ? `You've have upgraded Hydrogen ${selectedPinnedVersion} dependencies` : `You've have upgraded from ${fromToMsg}`;
  const packageManager = await getPackageManager(appPath);
  return renderSuccess({
    headline,
    // @ts-ignore we know that filter(Boolean) will always return an array
    customSections: [
      {
        title: "Updated dependencies",
        body: [
          {
            list: {
              items: updatedDependenciesList
            }
          }
        ]
      },
      {
        title: "What\u2019s next?",
        body: [
          {
            list: {
              items: nextSteps
            }
          }
        ]
      },
      {
        title: "Undo these upgrades?",
        body: [
          {
            list: {
              items: [
                `Run \`git restore . && git clean -df && ${packageManager} i\``
              ]
            }
          }
        ]
      }
    ].filter(Boolean)
  });
}
async function validateUpgrade({
  appPath,
  selectedRelease
}) {
  const dependencies = await getDependencies(
    path.join(appPath, "package.json")
  );
  const updatedVersion = dependencies["@shopify/hydrogen"];
  if (!updatedVersion) {
    throw new AbortError("Hydrogen version not found in package.json");
  }
  const updatedPinnedVersion = getAbsoluteVersion(updatedVersion);
  if (updatedPinnedVersion !== selectedRelease.version) {
    throw new AbortError(
      `Failed to upgrade to Hydrogen version ${selectedRelease.version}`,
      `You are still on version ${updatedPinnedVersion}`
    );
  }
}
function generateStepMd(item) {
  const { steps } = item;
  const heading = `### ${item.title} [#${item.id}](${item.pr})
`;
  const body = steps?.map((step, stepIndex) => {
    const pr = item.pr ? `[#${item.id}](${item.pr})
` : "";
    const multiStep = steps.length > 1;
    const title = multiStep ? `#### Step: ${stepIndex + 1}. ${step.title} ${pr}
` : `#### ${step.title.trim()}
`;
    const info = step.info ? `> ${step.info}
` : "";
    const code = step.code ? `${Buffer.from(step.code, "base64")}
` : "";
    const docs = item.docs ? `[docs](${item.docs})
` : "";
    return `${title}${info}${docs}${pr}${code}`;
  }).join("\n");
  return `${heading}
${body}`;
}
async function generateUpgradeInstructionsFile({
  appPath,
  cumulativeRelease,
  currentVersion,
  selectedRelease
}) {
  let filename = "";
  const { featuresMd, breakingChangesMd } = cumulativeRelease.features.filter((feature) => feature.steps).reduce(
    (acc, feature) => {
      if (feature.breaking) {
        acc.breakingChangesMd.push(generateStepMd(feature));
      } else {
        acc.featuresMd.push(generateStepMd(feature));
      }
      return acc;
    },
    { featuresMd: [], breakingChangesMd: [] }
  );
  const fixesMd = cumulativeRelease.fixes.filter((fixes) => fixes.steps).map(generateStepMd);
  if (!featuresMd.length && !fixesMd.length) {
    renderInfo({
      headline: `No upgrade instructions generated`,
      body: `There are no additional upgrade instructions for this version.`
    });
    return;
  }
  const absoluteFrom = getAbsoluteVersion(currentVersion);
  const absoluteTo = getAbsoluteVersion(selectedRelease.version);
  filename = `upgrade-${absoluteFrom}-to-${absoluteTo}.md`;
  const instructionsFolderPath = path.join(appPath, INSTRUCTIONS_FOLDER);
  const h1 = `# Hydrogen upgrade guide: ${absoluteFrom} to ${absoluteTo}`;
  let md = `${h1}

----
`;
  if (breakingChangesMd.length) {
    md += `
## Breaking changes

${breakingChangesMd.join("\n")}
----
`;
  }
  if (featuresMd.length) {
    md += `
## Features

${featuresMd.join("\n")}
----
`;
  }
  if (fixesMd.length) {
    md += `
${featuresMd.length ? "----\n\n" : ""}## Fixes

${fixesMd.join(
      "\n"
    )}`;
  }
  const filePath = path.join(instructionsFolderPath, filename);
  try {
    await isDirectory(instructionsFolderPath);
  } catch (error) {
    await mkdir(instructionsFolderPath);
  }
  if (!await fileExists(filePath)) {
    await touchFile(filePath);
  } else {
    const overwriteMdFile = await renderConfirmationPrompt({
      message: `A previous upgrade instructions file already exists for this version.
Do you want to overwrite it?`,
      defaultValue: false
    });
    if (overwriteMdFile) {
      await removeFile(`${filePath}.old`);
    } else {
      return;
    }
    await touchFile(filePath);
  }
  await writeFile(filePath, md);
  return `${INSTRUCTIONS_FOLDER}/${filename}`;
}
async function displayDevUpgradeNotice({
  targetPath
}) {
  const appPath = targetPath ? path.resolve(targetPath) : process.cwd();
  const { currentVersion } = await getHydrogenVersion({ appPath });
  const isPrerelease = semver.prerelease(currentVersion);
  if (isPrerelease || /^[a-z]+$/i.test(currentVersion)) {
    return;
  }
  const changelog = await getChangelog();
  const { availableUpgrades, uniqueAvailableUpgrades } = getAvailableUpgrades({
    releases: changelog.releases,
    currentVersion
  });
  if (availableUpgrades.length === 0 || !availableUpgrades[0]?.version) {
    return;
  }
  const pinnedLatestVersion = getAbsoluteVersion(availableUpgrades[0].version);
  const pinnedCurrentVersion = getAbsoluteVersion(currentVersion);
  const currentReleaseIndex = changelog.releases.findIndex((release) => {
    const pinnedReleaseVersion = getAbsoluteVersion(release.version);
    return pinnedReleaseVersion === pinnedCurrentVersion;
  });
  const uniqueNextReleases = changelog.releases.slice(0, currentReleaseIndex).reverse().reduce((acc, release) => {
    if (acc[release.version])
      return acc;
    acc[release.version] = release;
    return acc;
  }, {});
  const nextReleases = Object.keys(uniqueNextReleases).length ? Object.entries(uniqueNextReleases).map(([version, release]) => {
    return `${version} - ${release.title}`;
  }).slice(0, 5) : [];
  let headline = Object.keys(uniqueAvailableUpgrades).length > 1 ? `There are ${Object.keys(uniqueAvailableUpgrades).length} new @shopify/hydrogen versions available.` : `There's a new @shopify/hydrogen version available.`;
  const cliCommand = await getCliCommand();
  renderInfo({
    headline,
    body: [`Current: ${currentVersion} | Latest: ${pinnedLatestVersion}`],
    //@ts-ignore will always be an array
    customSections: nextReleases.length ? [
      {
        title: `The next ${nextReleases.length} version(s) include`,
        body: [
          {
            list: {
              items: [
                ...nextReleases,
                availableUpgrades.length > 5 && `...more`
              ].flat().filter(Boolean)
            }
          }
        ].filter(Boolean)
      },
      {
        title: "Next steps",
        body: [
          {
            list: {
              items: [
                `Run \`${cliCommand} upgrade\` or \`${cliCommand} upgrade --version XXXX.X.XX\``,
                ,
                `Read release notes at https://hydrogen.shopify.dev/releases`
              ]
            }
          }
        ]
      }
    ] : []
  });
}

export { buildUpgradeCommandArgs, Upgrade as default, displayConfirmation, displayDevUpgradeNotice, getAbsoluteVersion, getAvailableUpgrades, getChangelog, getCummulativeRelease, getHydrogenVersion, getSelectedRelease, hasOutdatedDependencies, isUpgradeableRelease, runUpgrade, upgradeNodeModules };
