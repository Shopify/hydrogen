import {getAbsoluteVersion} from '../commands/hydrogen/upgrade.js';
import upgrade20255 from './2025-5.js';
import semver from 'semver';

const upgrades = [upgrade20255];

export async function runCodemodUpgrades(
  from: string,
  to: string,
  path: string,
) {
  const fromVersion = getAbsoluteVersion(from);
  const toVersion = getAbsoluteVersion(to);

  const upgradesToRun = upgrades.filter(({version}) => {
    return semver.gt(version, fromVersion) && semver.lte(version, toVersion);
  });

  for (const upgrade of upgradesToRun) {
    try {
      await upgrade.codemod(path);
    } catch (error) {
      console.error(error);
    }
  }
}
