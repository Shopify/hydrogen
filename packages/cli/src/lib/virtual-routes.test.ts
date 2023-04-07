import {describe, it, expect} from 'vitest';
import {fileURLToPath} from 'url';
import type {RemixConfig} from '@remix-run/dev/dist/config.js';
import {
  addVirtualRoutes,
  VIRTUAL_ROOT,
  VIRTUAL_ROUTES_DIR,
} from './virtual-routes.js';

describe('virtual routes', () => {
  it('adds virtual routes', async () => {
    const config = {
      appDirectory: fileURLToPath(new URL('../virtual-test', import.meta.url)),
      routes: {},
    } as RemixConfig;

    await addVirtualRoutes(config);

    expect(config.routes[VIRTUAL_ROOT]).toMatchObject({
      path: '',
      id: VIRTUAL_ROOT,
      file: '../virtual-routes/virtual-root.jsx',
    });

    expect(config.routes[VIRTUAL_ROUTES_DIR + '/index']).toMatchObject({
      parentId: VIRTUAL_ROOT,
      path: undefined,
      file: '../' + VIRTUAL_ROUTES_DIR + '/index.tsx',
    });

    expect(config.routes[VIRTUAL_ROUTES_DIR + '/graphiql']).toMatchObject({
      parentId: VIRTUAL_ROOT,
      path: 'graphiql',
      file: '../' + VIRTUAL_ROUTES_DIR + '/graphiql.tsx',
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
    } as unknown as RemixConfig;

    await addVirtualRoutes(config);

    expect(config.routes[existingIndexRoute.id]).toMatchObject(
      existingIndexRoute,
    );

    expect(config.routes[VIRTUAL_ROUTES_DIR + '/index']).toBeFalsy();

    expect(Object.values(config.routes).length).toBeGreaterThan(2);
  });
});
