import {describe, it, expect} from 'vitest';
import {
  getVirtualRoutes,
  getVirtualRoutesV3,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_ORIG,
} from './get-virtual-routes.js';

describe('virtual routes', () => {
  it('gets virtual routes', async () => {
    await expect(getVirtualRoutes()).resolves.toMatchObject({
      root: {file: expect.any(String), id: VIRTUAL_ROOT_ORIG, path: ''},
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

  it('gets virtual routes V3', async () => {
    await expect(getVirtualRoutesV3()).resolves.toMatchObject({
      root: {file: expect.any(String), id: VIRTUAL_ROOT, path: ''},
      routes: expect.arrayContaining([
        {
          id: expect.any(String),
          file: expect.stringContaining('graphiql.jsx'),
          index: false,
          path: 'graphiql',
        },
        {
          id: expect.any(String),
          file: expect.stringContaining('subrequest-profiler.jsx'),
          index: false,
          path: 'subrequest-profiler',
        },
        {
          id: expect.any(String),
          file: expect.stringContaining('index.jsx'),
          index: true,
          path: '',
        },
      ]),
    });
  });
});
