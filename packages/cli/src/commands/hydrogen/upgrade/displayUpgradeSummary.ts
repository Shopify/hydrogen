import type {PackageToUpgrade} from './types.js';
import {getProjectDependencies} from './index.js';
import {renderSuccess, renderError} from '@shopify/cli-kit/node/ui';

/**
 * Display the summary of the packages that were upgraded, including any that failed
 * @param packageJsonPath - Path to the package.json file
 * @param packagesToUpdate - Array of packages to upgrade
 * @returns void
 **/
export async function displayUpgradeSummary({
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
