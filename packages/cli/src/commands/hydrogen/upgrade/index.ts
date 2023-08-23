// This export is to make vitest spyOn happy because it doesn't work
// if methods are in the same module as the main runer i.e `upgrade` fn
export {displayCurrentVersions} from './displayCurrentVersions.js';
export {displayUpgradePlan} from './displayUpgradePlan.js';
export {displayUpgradeSummary} from './displayUpgradeSummary.js';
export {getDependencyType} from './getDependencyType.js';
export {getProjectDependencies} from './getProjectDependencies.js';
export {getRequiredHydrogenCli} from './getRequiredHydrogenCli.js';
export {getRequiredRemixOxygen} from './getRequiredRemixOxygen.js';
export {getUpgradeCommand} from './getUpgradeCommand.js';
export {promptForUpgrade} from './promptForUpgrade.js';
export {promptDependencyUpdate} from './promptDependencyUpdate.js';
export {upgradePackages} from './upgradePackages.js';
