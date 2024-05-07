import { fileURLToPath } from 'node:url';
import { execAsync } from './process.js';

const GENERATOR_TEMPLATES_DIR = "generator-templates";
const GENERATOR_STARTER_DIR = "starter";
const GENERATOR_APP_DIR = "app";
const GENERATOR_ROUTE_DIR = "routes";
const GENERATOR_SETUP_ASSETS_DIR = "assets";
const GENERATOR_SETUP_ASSETS_SUB_DIRS = [
  "tailwind",
  "css-modules",
  "vanilla-extract",
  "postcss",
  "vite"
];
function getAssetDir(feature) {
  if (process.env.NODE_ENV === "test") {
    return fileURLToPath(
      new URL(`../setup-assets/${feature}`, import.meta.url)
    );
  }
  return fileURLToPath(
    new URL(
      `./${GENERATOR_TEMPLATES_DIR}/${GENERATOR_SETUP_ASSETS_DIR}/${feature}`,
      import.meta.url
    )
  );
}
function getTemplateAppFile(filepath, root = getStarterDir()) {
  const url = new URL(
    `${root}/${GENERATOR_APP_DIR}${filepath ? `/${filepath}` : ""}`,
    import.meta.url
  );
  return url.protocol === "file:" ? fileURLToPath(url) : url.toString();
}
function getStarterDir() {
  if (process.env.NODE_ENV === "test") {
    return getSkeletonSourceDir();
  }
  return fileURLToPath(
    new URL(
      `./${GENERATOR_TEMPLATES_DIR}/${GENERATOR_STARTER_DIR}`,
      import.meta.url
    )
  );
}
function getSkeletonSourceDir() {
  return fileURLToPath(
    new URL(`../../../../templates/skeleton`, import.meta.url)
  );
}
async function getRepoNodeModules() {
  const { stdout } = await execAsync("npm root");
  return stdout.trim() || fileURLToPath(new URL(`../../../../node_modules`, import.meta.url));
}

export { GENERATOR_APP_DIR, GENERATOR_ROUTE_DIR, GENERATOR_SETUP_ASSETS_DIR, GENERATOR_SETUP_ASSETS_SUB_DIRS, GENERATOR_STARTER_DIR, GENERATOR_TEMPLATES_DIR, getAssetDir, getRepoNodeModules, getSkeletonSourceDir, getStarterDir, getTemplateAppFile };
