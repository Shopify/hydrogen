import type {PackageToUpgrade} from './types.js';
import {getDependencyType} from './index.js';
import {execa} from 'execa';

/**
 * Given a Hydrogen version we want to upgrade to and the current Hydrogen-cli version,
 * it returns the minimum Hydrogen-cli version that supports the Hydrogen version
 * based on the @shopify/hydrogen-react peer dependency of the Hydrogen version.
 * @param selectedHydrogen - The Hydrogen version to upgrade to
 * @param allDeps - All dependencies in the package.json
 */
export async function getRequiredHydrogenCli({
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

  let nextCliVersion = '';
  const cliVersionsForSelectedHydrogenReact =
    rawCliVersionsForSelectedHydrogenReact
      .split('\n')
      .filter(Boolean)
      .reduce((acc, line: string, index) => {
        const [cliPkg, rawHydrogenReactVersion] = line.split(' ');
        if (!cliPkg || !rawHydrogenReactVersion) return acc;

        const cliVersion = cliPkg.replace(/^@shopify\/cli-hydrogen@/, '');

        const h2ReactVersion = rawHydrogenReactVersion
          .replace(/\^/, '')
          .replace(/'/g, '');

        if (index === 0 && !nextCliVersion) {
          nextCliVersion = h2ReactVersion;
        }
        return {
          ...acc,
          [h2ReactVersion]: cliVersion,
        };
      }, defaultCliVersions);

  const requiredCliVersion =
    cliVersionsForSelectedHydrogenReact[requiredH2ReactVersion] ||
    cliVersionsForSelectedHydrogenReact[nextCliVersion];

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
