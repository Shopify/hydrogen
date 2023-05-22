import {fileURLToPath} from 'node:url';

export const GENERATOR_TEMPLATES_DIR = 'generator-templates';
export const GENERATOR_SETUP_ASSETS_DIR = 'assets';
export const GENERATOR_ROUTES_DIR = 'routes';

export function getAssetDir(feature: string) {
  return fileURLToPath(
    new URL(
      `../${GENERATOR_TEMPLATES_DIR}/${GENERATOR_SETUP_ASSETS_DIR}/${feature}`,
      import.meta.url,
    ),
  );
}

export function getRouteFile(routeFrom: string, root = '..') {
  return fileURLToPath(
    new URL(
      `${root}/${GENERATOR_TEMPLATES_DIR}/${GENERATOR_ROUTES_DIR}/${routeFrom}.tsx`,
      import.meta.url,
    ),
  );
}
