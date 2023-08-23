import type {Dependencies} from './types.js';
import {renderInfo} from '@shopify/cli-kit/node/ui';

/**
 * Display the current package versions found in the package.json
 */
export function displayCurrentVersions({
  dependencies,
  devDependencies,
}: {
  dependencies: Dependencies;
  devDependencies: Dependencies;
}) {
  const upgradeableDependencies = Object.keys(dependencies).reduce(
    (filtered, dep) => {
      const depKey = dep as keyof typeof dependencies;
      const updgradable =
        dep.startsWith('@shopify') || dep.startsWith('@remix-run');
      if (updgradable) {
        filtered.push(`${depKey}@${dependencies[dep]}`);
      }
      return filtered;
    },
    [] as string[],
  );

  const upgradableDevDependencies = Object.keys(devDependencies).reduce(
    (filtered, dep) => {
      const depKey = dep as keyof typeof devDependencies;
      const updgradable =
        dep.startsWith('@shopify') || dep.startsWith('@remix-run');
      if (updgradable) {
        filtered.push(`${depKey}@${devDependencies[dep]}`);
      }
      return filtered;
    },
    [] as string[],
  );

  renderInfo({
    headline: 'Current versions',
    // @ts-expect-error we know that the filter above will remove all falsy values
    customSections: [
      upgradeableDependencies.length && {
        title: 'Dependencies',
        body: [
          {
            list: {
              items: upgradeableDependencies,
            },
          },
        ],
      },
      upgradableDevDependencies.length && {
        title: 'Dev dependencies',
        body: [
          {
            list: {
              items: upgradableDevDependencies,
            },
          },
        ],
      },
    ].filter(Boolean),
    body: '',
  });
}
