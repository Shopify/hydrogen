import type {Dependencies, PackageToUpgrade} from './types.js';
import TimeAgo from 'javascript-time-ago';
import {
  getDependencyType,
  getRequiredHydrogenCli,
  getRequiredRemixOxygen,
  promptDependencyUpdate,
} from './index.js';
// import {getDependencyType} from './getDependencyType.js';
// import {getRequiredHydrogenCli} from './getRequiredHydrogenCli.js';
// import {getRequiredRemixOxygen} from './getRequiredRemixOxygen.js';
// import {promptDependencyUpdate} from './promptDependencyUpdate.js';

/**
 * Display the multiple prompts to select which packages to upgrade
 * @param packageJsonPath - Path to the Hydrogen app's package.json
 * @returns Array of packages to upgrade
 */
export async function promptForUpgrade({
  dependencies,
  devDependencies,
}: {
  dependencies: Dependencies;
  devDependencies: Dependencies;
}): Promise<PackageToUpgrade[]> {
  const timeAgo = await initTimeAgo();

  // prompt for @shopify/hydrogen version
  const selectedHydrogen = await promptDependencyUpdate({
    name: '@shopify/hydrogen',
    dependency: dependencies['@shopify/hydrogen'],
    timeAgo,
  });

  let selectedHydrogenCli;
  let selectedRemixOxygen;

  if (selectedHydrogen?.version) {
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
    // TODO: do we want this flow to allow for indenpdent upgrading of cli-hydrogen and remix-oxygen?
    // If we don't have a selectedHydrogen, we prompt for the Hydrogen-cli version
    selectedHydrogenCli = await promptDependencyUpdate({
      name: '@shopify/cli-hydrogen',
      dependency:
        dependencies['@shopify/cli-hydrogen'] ||
        devDependencies['@shopify/cli-hydrogen'],
      timeAgo,
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
        timeAgo,
      });
    }
  }

  // generic packages without inter-dependencies
  const selectedWorkersTypes = await promptDependencyUpdate({
    name: '@shopify/oxygen-workers-types',
    dependency:
      dependencies['@shopify/oxygen-workers-types'] ||
      devDependencies['@shopify/oxygen-workers-types'],
    timeAgo,
  });

  const selectedPrettierConfig = await promptDependencyUpdate({
    name: '@shopify/prettier-config',
    dependency: devDependencies['@shopify/prettier-config'],
    timeAgo,
  });

  const selectedShopifyCli = await promptDependencyUpdate({
    name: '@shopify/cli',
    dependency: dependencies['@shopify/cli'] || devDependencies['@shopify/cli'],
    timeAgo,
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
 * Initialize the timeAgo library with the user's locale
 */
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
