import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {renderWarning} from '@shopify/cli-kit/node/ui';

export function checkRemixVersions() {
  const require = createRequire(import.meta.url);
  const hydrogenPkgJson = require(fileURLToPath(
    new URL('../../package.json', import.meta.url),
  ));

  const requiredVersionInHydrogen = hydrogenPkgJson.dependencies[
    '@remix-run/dev'
  ] as string;

  const pkgs = [
    'dev',
    'react',
    'server-runtime',
    'css-bundle',
    'node',
    'express',
    'eslint-config',
  ].map((name) => getRemixPackageVersion(require, name));

  const outOfSyncPkgs = pkgs.filter(
    (pkg) => pkg.version && pkg.version !== requiredVersionInHydrogen,
  );

  if (outOfSyncPkgs.length === 0) return;

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

function getRemixPackageVersion(require: NodeRequire, name: string) {
  const pkgName = '@remix-run/' + name;
  const result = {name: pkgName, version: ''};

  try {
    const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
    const pkgJson = require(pkgJsonPath);
    result.version = pkgJson.version as string;
  } catch {
    // Ignore errors
  }

  return result;
}
