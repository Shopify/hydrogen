import {describe, it, expect} from 'vitest';
import {
  getVirtualRoutesV3,
  createVirtualRoutesPath,
} from './get-virtual-routes.js';

describe('virtual routes', () => {
  it('gets virtual routes V3', async () => {
    await expect(getVirtualRoutesV3()).resolves.toMatchObject({
      layout: {
        file: expect.stringContaining('layout.jsx'),
      },
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

  it('decodes URL-encoded file paths with spaces', () => {
    // Mock import.meta.url with a path containing a space
    const mockImportMetaUrl =
      'file:///path/with%20space/vite/get-virtual-routes.ts';

    const result = createVirtualRoutesPath(
      mockImportMetaUrl,
      ['vite', 'virtual-routes'],
      'layout.jsx',
    );

    // Should decode %20 to actual space
    expect(result).toContain('with space');
    expect(result).not.toContain('%20');
  });

  it('removes Windows drive path prefix (e.g. /C:/)', () => {
    // Mock a Windows file URL with C: drive letter
    const mockWindowsUrl =
      'file:///C:/Users/developer/project/vite/get-virtual-routes.ts';

    const result = createVirtualRoutesPath(
      mockWindowsUrl,
      ['vite', 'virtual-routes'],
      'layout.jsx',
    );

    // Should remove /C:/ prefix and normalize to Unix-style path
    expect(result).not.toContain('/C:/');
    expect(result).toContain('/Users/developer/project');
    expect(result).toContain('layout.jsx');
  });
});
