import type {PackageToUpgrade} from './types.js';
import {getDependencyType} from './index.js';
import {execa} from 'execa';

/**
 * Given a Hydrogen-cli version we want to upgrade to, it returns the minimum
 * @shopify/remix-oxygen version that supports the Hydrogen-cli version
 */
export async function getRequiredRemixOxygen({
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
