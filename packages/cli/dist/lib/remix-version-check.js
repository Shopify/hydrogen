import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderWarning } from '@shopify/cli-kit/node/ui';

function getRequiredRemixVersion(require2 = createRequire(import.meta.url)) {
  const hydrogenPkgJson = require2(fileURLToPath(
    new URL("../../package.json", import.meta.url)
  ));
  return hydrogenPkgJson.peerDependencies["@remix-run/dev"];
}
function checkRemixVersions() {
  const require2 = createRequire(import.meta.url);
  const requiredVersionInHydrogen = getRequiredRemixVersion(require2);
  const satisfiesSemver = require2("semver/functions/satisfies.js");
  const pkgs = [
    "dev",
    "react",
    "server-runtime",
    "css-bundle",
    "node",
    "express",
    "eslint-config"
  ].map((name) => getRemixPackageVersion(require2, name));
  const outOfSyncPkgs = pkgs.filter(
    (pkg) => pkg.version && !satisfiesSemver(pkg.version, requiredVersionInHydrogen)
  );
  if (outOfSyncPkgs.length === 0)
    return;
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
function getRemixPackageVersion(require2, name) {
  const pkgName = "@remix-run/" + name;
  const result = { name: pkgName, version: "" };
  try {
    const pkgJsonPath = require2.resolve(`${pkgName}/package.json`);
    const pkgJson = require2(pkgJsonPath);
    result.version = pkgJson.version;
  } catch {
  }
  return result;
}

export { checkRemixVersions, getRequiredRemixVersion };
