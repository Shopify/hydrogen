import { createRequire } from 'node:module';
import { renderWarning } from '@shopify/cli-kit/node/ui';

const REQUIRED_REMIX_VERSION = "^2.1.0";
function checkRemixVersions(projectPath, requiredVersionInHydrogen = REQUIRED_REMIX_VERSION) {
  const require2 = createRequire(import.meta.url);
  const satisfiesSemver = require2("semver/functions/satisfies.js");
  const pkgs = [
    "dev",
    "react",
    "server-runtime",
    "css-bundle",
    "node",
    "express",
    "eslint-config"
  ].map((name) => getRemixPackageVersion(require2, name, projectPath));
  const outOfSyncPkgs = pkgs.filter(
    (pkg) => pkg.version && !satisfiesSemver(pkg.version, requiredVersionInHydrogen)
  );
  if (outOfSyncPkgs.length === 0) return;
  const items = outOfSyncPkgs.reduce((acc, item) => {
    if (item.version) {
      acc.push(`${item.name}@${item.version}`);
    }
    return acc;
  }, []);
  renderWarning({
    headline: `The current version of Hydrogen requires Remix @${requiredVersionInHydrogen}. The following packages are out of sync:`,
    body: [
      { list: { items } },
      "\nPlease ensure your Remix packages have the same version and are in sync with Hydrogen."
    ]
  });
}
function getRemixPackageVersion(require2, name, root) {
  const pkgName = "@remix-run/" + name;
  const result = { name: pkgName, version: "" };
  try {
    const pkgJsonPath = require2.resolve(`${pkgName}/package.json`, {
      paths: [root]
    });
    const pkgJson = require2(pkgJsonPath);
    result.version = pkgJson.version;
  } catch {
  }
  return result;
}

export { REQUIRED_REMIX_VERSION, checkRemixVersions };
