import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { findUpAndReadPackageJson } from '@shopify/cli-kit/node/node-package-manager';
import { joinPath, dirname } from '@shopify/cli-kit/node/path';

const require2 = createRequire(import.meta.url);
async function importVite(root) {
  const vitePath = require2.resolve("vite", { paths: [root] });
  const vitePackageJson = await findUpAndReadPackageJson(vitePath);
  const viteNodeIndexFile = vitePackageJson.content.exports?.["."].import.default;
  const viteNodePath = joinPath(
    dirname(vitePackageJson.path),
    viteNodeIndexFile
  );
  return import(pathToFileURL(viteNodePath).href);
}
function importLocal(packageName, path) {
  const realPath = require2.resolve(packageName, { paths: [path] });
  return import(pathToFileURL(realPath).href);
}

export { importLocal, importVite };
