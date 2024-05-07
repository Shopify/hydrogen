import path from 'node:path';
import { createRequire } from 'node:module';
import { checkForNewVersion } from '@shopify/cli-kit/node/node-package-manager';
import { renderInfo } from '@shopify/cli-kit/node/ui';

const PACKAGE_NAMES = {
  main: "@shopify/hydrogen",
  cli: "@shopify/cli-hydrogen"
};
async function checkHydrogenVersion(resolveFrom, pkgKey = "main") {
  if (process.env.LOCAL_DEV)
    return;
  const pkgName = PACKAGE_NAMES[pkgKey];
  const require2 = createRequire(import.meta.url);
  const pkgJsonPath = resolveFrom.endsWith("package.json") ? locateDependency(require2, resolveFrom) : locateDependency(
    require2,
    path.join(pkgName, "package.json"),
    resolveFrom
  );
  if (!pkgJsonPath)
    return;
  const currentVersion = require2(pkgJsonPath).version;
  if (!currentVersion || currentVersion.includes("next"))
    return;
  const newVersionAvailable = await checkForNewVersion(pkgName, currentVersion);
  if (!newVersionAvailable)
    return;
  return (extraMessage = "") => {
    renderInfo({
      headline: "Upgrade available",
      body: `Version ${newVersionAvailable} of ${pkgName} is now available.
You are currently running v${currentVersion}.` + (extraMessage ? "\n\n" : "") + extraMessage,
      reference: [
        {
          link: {
            label: "Hydrogen releases",
            url: "https://github.com/Shopify/hydrogen/releases"
          }
        }
      ]
    });
    return { currentVersion, newVersion: newVersionAvailable };
  };
}
function locateDependency(require2, nameToResolve, resolveFrom) {
  try {
    return require2.resolve(nameToResolve, {
      paths: [resolveFrom ?? process.cwd()]
    });
  } catch {
    return;
  }
}

export { checkHydrogenVersion };
