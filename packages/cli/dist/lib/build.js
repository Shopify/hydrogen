import { fileURLToPath } from 'node:url';
import { findPathUp } from '@shopify/cli-kit/node/fs';
import { AbortError } from '@shopify/cli-kit/node/error';
import { joinPath, dirname } from '@shopify/cli-kit/node/path';
import { execAsync } from './process.js';

const monorepoPackagesPath = new URL("../../..", import.meta.url).pathname;
const isHydrogenMonorepo = monorepoPackagesPath.endsWith(
  "/hydrogen/packages/"
);
const hydrogenPackagesPath = isHydrogenMonorepo ? monorepoPackagesPath : void 0;
const ASSETS_DIR_PREFIX = "assets/hydrogen";
const ASSETS_STARTER_DIR = "starter";
const ASSETS_STARTER_DIR_ROUTES = "routes";
let pkgJsonPath;
async function getPkgJsonPath() {
  pkgJsonPath ??= await findPathUp("package.json", {
    cwd: fileURLToPath(import.meta.url),
    type: "file"
  });
  if (!pkgJsonPath) {
    throw new AbortError(
      "Could not find assets directory",
      "Please report this error."
    );
  }
  return pkgJsonPath;
}
async function getAssetsDir(feature, ...subpaths) {
  return joinPath(
    dirname(await getPkgJsonPath()),
    process.env.SHOPIFY_UNIT_TEST ? `assets` : `dist/${ASSETS_DIR_PREFIX}`,
    feature ?? "",
    ...subpaths
  );
}
async function getTemplateAppFile(filepath, root) {
  root ??= await getStarterDir();
  const url = new URL(
    `${root}/app${filepath ? `/${filepath}` : ""}`,
    import.meta.url
  );
  return url.protocol === "file:" ? fileURLToPath(url) : url.toString();
}
function getStarterDir(useSource = !!process.env.SHOPIFY_UNIT_TEST) {
  if (useSource) return getSkeletonSourceDir();
  return getAssetsDir(ASSETS_STARTER_DIR);
}
function getSkeletonSourceDir() {
  if (!isHydrogenMonorepo) {
    throw new AbortError(
      "Trying to use skeleton source dir outside of Hydrogen monorepo.",
      "Please report this error."
    );
  }
  return joinPath(dirname(monorepoPackagesPath), "templates", "skeleton");
}
async function getRepoNodeModules() {
  const { stdout } = await execAsync("npm root");
  let nodeModulesPath = stdout.trim();
  if (!nodeModulesPath && isHydrogenMonorepo) {
    nodeModulesPath = joinPath(dirname(monorepoPackagesPath), "node_modules");
  }
  return nodeModulesPath;
}

export { ASSETS_DIR_PREFIX, ASSETS_STARTER_DIR, ASSETS_STARTER_DIR_ROUTES, getAssetsDir, getPkgJsonPath, getRepoNodeModules, getSkeletonSourceDir, getStarterDir, getTemplateAppFile, hydrogenPackagesPath, isHydrogenMonorepo };
