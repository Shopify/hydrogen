import {createRequire} from 'node:module';
import {renderWarning} from '@shopify/cli-kit/node/ui';

export const REQUIRED_REMIX_VERSION = '^2.16.1';
export const REQUIRED_REACT_ROUTER_VERSION = '^7.7.0';

export function checkRemixVersions(
  projectPath: string,
  requiredVersionInHydrogen = REQUIRED_REMIX_VERSION,
) {
  const require = createRequire(import.meta.url);

  // Require this after requiring the hydrogen
  // package version to avoid breaking test mocks.
  const satisfiesSemver =
    require('semver/functions/satisfies.js') as typeof import('semver/functions/satisfies.js');

  // First check for React Router v7 packages
  const reactRouterPkgs = [
    {prefix: '', name: 'react-router'},
    {prefix: '@react-router/', name: 'dev'},
    {prefix: '@react-router/', name: 'node'},
    {prefix: '@react-router/', name: 'express'},
  ].map(({prefix, name}) => getPackageVersion(require, prefix + name, projectPath));

  const hasReactRouter = reactRouterPkgs.some(pkg => pkg.version);

  if (hasReactRouter) {
    // Check React Router versions
    const outOfSyncPkgs = reactRouterPkgs.filter(
      (pkg) =>
        pkg.version && !satisfiesSemver(pkg.version, REQUIRED_REACT_ROUTER_VERSION),
    );

    if (outOfSyncPkgs.length > 0) {
      const items = outOfSyncPkgs.reduce((acc, item) => {
        if (item.version) {
          acc.push(`${item.name}@${item.version}`);
        }
        return acc;
      }, [] as string[]);

      renderWarning({
        headline: `The current version of Hydrogen requires React Router @${REQUIRED_REACT_ROUTER_VERSION}. The following packages are out of sync:`,
        body: [
          {list: {items}},
          '\nPlease ensure your React Router packages have the same version and are in sync with Hydrogen.',
        ],
      });
    }
  } else {
    // Fall back to checking legacy Remix packages
    const pkgs = [
      'dev',
      'react',
      'server-runtime',
      'css-bundle',
      'node',
      'express',
      'eslint-config',
    ].map((name) => getPackageVersion(require, '@remix-run/' + name, projectPath));

    const outOfSyncPkgs = pkgs.filter(
      (pkg) =>
        pkg.version && !satisfiesSemver(pkg.version, requiredVersionInHydrogen),
    );

    if (outOfSyncPkgs.length > 0) {
      const items = outOfSyncPkgs.reduce((acc, item) => {
        if (item.version) {
          acc.push(`${item.name}@${item.version}`);
        }
        return acc;
      }, [] as string[]);

      renderWarning({
        headline: `The current version of Hydrogen requires Remix @${requiredVersionInHydrogen}. The following packages are out of sync:`,
        body: [
          {list: {items}},
          '\nPlease ensure your Remix packages have the same version and are in sync with Hydrogen.',
        ],
      });
    }
  }
}

// Generic function to get package version
function getPackageVersion(
  require: NodeRequire,
  pkgName: string,
  root: string,
) {
  const result = {name: pkgName, version: ''};

  try {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`, {
      paths: [root],
    });
    const pkgJson = require(pkgJsonPath);
    result.version = pkgJson.version as string;
  } catch {
    // Ignore errors
  }

  return result;
}
