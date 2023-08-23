import type {Choice, PackageToUpgrade, SupportedPackage} from './types.js';
import {getDependencyType} from './index.js';
// import {getDependencyType} from './getDependencyType.js';
// import {getRequiredHydrogenCli} from './getRequiredHydrogenCli.js';
// import {getRequiredRemixOxygen} from './getRequiredRemixOxygen.js';
import {execa} from 'execa';
import TimeAgo from 'javascript-time-ago';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import semver from 'semver';

type Version = {
  version: string;
  date: string;
};

/**
 * Utility function to prompt the user to upgrade a dependency
 * @param dependency - The dependency to upgrade
 * @param name - The name of the dependency
 * @returns Promise<null | PackageToUpgrade>
 **/
export async function promptDependencyUpdate({
  timeAgo,
  dependency,
  name,
  minVersion,
}: {
  dependency: string | undefined;
  name: SupportedPackage;
  minVersion?: string | null;
  timeAgo: TimeAgo;
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
}

/**
 * Prepend the skip choice to the list of choices in a prompt
 * @param choices - The choices to prepend the skip choice to
 * @returns Choice<string>[]
 **/
function withSkipChoice(choices: Choice<string>[]) {
  if (!choices.length) {
    return [];
  }

  const skipChoice = {
    value: 'skip',
    label: "Don't upgrade",
  };

  return [skipChoice, ...choices];
}
