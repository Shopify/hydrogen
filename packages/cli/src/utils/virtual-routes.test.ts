import {describe, it, expect} from 'vitest';
import {fileURLToPath} from 'url';
import type {RemixConfig} from '@remix-run/dev/dist/config.js';
import {
  addVirtualRoutes,
  VIRTUAL_ROUTES_DIR,
  V1_DIR,
  V2_META_DIR,
} from './virtual-routes.js';

function buildPaths(directory: string) {
  const virtualRoutesDir = `${VIRTUAL_ROUTES_DIR}/${directory}`;
  return {
    routesDir: `${virtualRoutesDir}/routes`,
    root: `${virtualRoutesDir}/virtual-root`,
  };
}

describe('virtual routes', () => {
  it('adds virtual routes', async () => {
    const config = {
      appDirectory: fileURLToPath(new URL('../virtual-test', import.meta.url)),
      routes: {},
      future: {
        v2_meta: false,
      },
    } as RemixConfig;

    const {routesDir, root} = buildPaths(V1_DIR);

    await addVirtualRoutes(config);

    expect(config.routes[root]).toMatchObject({
      path: '',
      id: root,
      file: '../' + root + '.jsx',
    });

    expect(config.routes[routesDir + '/index']).toMatchObject({
      parentId: root,
      path: undefined,
      file: '../' + routesDir + '/index.tsx',
    });

    expect(config.routes[routesDir + '/graphiql']).toMatchObject({
      parentId: root,
      path: 'graphiql',
      file: '../' + routesDir + '/graphiql.tsx',
    });
  });

  it('skips existing routes', async () => {
    const existingIndexRoute = {
      id: 'routes/index',
      index: true,
      parentId: 'root',
      path: undefined,
      file: 'user-app/routes/index.tsx',
    };

    const config = {
      appDirectory: fileURLToPath(new URL('../virtual-test', import.meta.url)),
      routes: {
        [existingIndexRoute.id]: existingIndexRoute,
      },
      future: {
        v2_meta: false,
      },
    } as unknown as RemixConfig;

    const {routesDir} = buildPaths(V1_DIR);

    await addVirtualRoutes(config);

    expect(config.routes[existingIndexRoute.id]).toMatchObject(
      existingIndexRoute,
    );

    expect(config.routes[routesDir + '/index']).toBeFalsy();

    expect(Object.values(config.routes).length).toBeGreaterThan(2);
  });

  it('adds virtual routes when v2_meta future flag is turned on', async () => {
    const config = {
      appDirectory: fileURLToPath(new URL('../virtual-test', import.meta.url)),
      routes: {},
      future: {
        v2_meta: true,
      },
    } as RemixConfig;

    const {routesDir, root} = buildPaths(V2_META_DIR);

    await addVirtualRoutes(config);

    expect(config.routes[root]).toMatchObject({
      path: '',
      id: root,
      file: '../' + root + '.jsx',
    });

    expect(config.routes[routesDir + '/index']).toMatchObject({
      parentId: root,
      path: undefined,
      file: '../' + routesDir + '/index.tsx',
    });

    expect(config.routes[routesDir + '/graphiql']).toMatchObject({
      parentId: root,
      path: 'graphiql',
      file: '../' + routesDir + '/graphiql.tsx',
    });
  });
});
