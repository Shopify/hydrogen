import {describe, it, expect} from 'vitest';
import {getVirtualRoutes, VIRTUAL_ROOT} from './get-virtual-routes.js';

describe('virtual routes', () => {
  it('gets virtual routes', async () => {
    await getVirtualRoutes();
    await expect(getVirtualRoutes()).resolves.toMatchObject({
      root: {file: expect.any(String), id: VIRTUAL_ROOT, path: ''},
      routes: expect.arrayContaining([
        {
          id: expect.any(String),
          file: expect.stringContaining('graphiql.tsx'),
          index: false,
          path: 'graphiql',
        },
        {
          id: expect.any(String),
          file: expect.stringContaining('subrequest-profiler.tsx'),
          index: false,
          path: 'subrequest-profiler',
        },
        {
          id: expect.any(String),
          file: expect.stringContaining('index.tsx'),
          index: true,
          path: '',
        },
      ]),
    });
  });
});
