import type {PackageToUpgrade} from './types.js';
import {renderInfo} from '@shopify/cli-kit/node/ui';

/**
 * Display the selected packages to upgrade split into dependencies and devDependencies
 * @param packagesToUpdate - Array of packages to upgrade
 * @returns void
 */
export async function displayUpgradePlan({
  packagesToUpdate,
}: {
  packagesToUpdate: PackageToUpgrade[];
}) {
  let defaultDeps = {
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
    defaultDeps,
  );

  renderInfo({
    headline: 'Upgrading',
    body: '',
    // @ts-expect-error we know that the filter above will remove all falsy values
    customSections: [
      dependencies.length && {
        title: 'Dependencies',
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
