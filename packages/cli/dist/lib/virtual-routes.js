import { glob } from '@shopify/cli-kit/node/fs';
import { joinPath, relativePath } from '@shopify/cli-kit/node/path';
import { hydrogenPackagesPath, getAssetsDir } from './build.js';

const VIRTUAL_ROUTES_DIR = "virtual-routes/routes";
const VIRTUAL_ROOT = "virtual-routes/virtual-root";
async function addVirtualRoutes(config) {
  const distPath = process.env.SHOPIFY_UNIT_TEST && hydrogenPackagesPath ? joinPath(hydrogenPackagesPath, "hydrogen", "src", "vite") : await getAssetsDir();
  const userRouteList = Object.values(config.routes);
  const virtualRoutesPath = joinPath(distPath, VIRTUAL_ROUTES_DIR);
  for (const absoluteFilePath of await glob(
    joinPath(virtualRoutesPath, "**", "*")
  )) {
    const relativeFilePath = relativePath(virtualRoutesPath, absoluteFilePath);
    const routePath = relativeFilePath.replace(/\.[jt]sx?$/, "").replaceAll("\\", "/");
    const isIndex = /(^|\/)index$/.test(routePath);
    const normalizedVirtualRoutePath = isIndex ? routePath.slice(0, -"index".length).replace(/\/$/, "") || void 0 : (
      // TODO: support v2 flat routes?
      routePath.replace(/\$/g, ":").replace(/[\[\]]/g, "")
    );
    const hasUserRoute = userRouteList.some(
      (r) => r.parentId === "root" && r.path === normalizedVirtualRoutePath
    );
    if (!hasUserRoute) {
      const id = VIRTUAL_ROUTES_DIR + "/" + routePath;
      config.routes[id] = {
        id,
        parentId: VIRTUAL_ROOT,
        path: normalizedVirtualRoutePath,
        index: isIndex || void 0,
        caseSensitive: void 0,
        file: relativePath(config.appDirectory, absoluteFilePath)
      };
      if (!config.routes[VIRTUAL_ROOT]) {
        config.routes[VIRTUAL_ROOT] = {
          id: VIRTUAL_ROOT,
          path: "",
          file: relativePath(
            config.appDirectory,
            joinPath(distPath, VIRTUAL_ROOT + ".jsx")
          )
        };
      }
    }
  }
  return config;
}

export { VIRTUAL_ROOT, VIRTUAL_ROUTES_DIR, addVirtualRoutes };
