import {it, vi, describe, expect} from 'vitest';
import {transformWithEsbuild} from 'vite';
import {buildAssetsUrl, startMiniOxygen} from './index.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import {
  inTemporaryDirectory,
  removeFile,
  touchFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import getPort from 'get-port';

describe('MiniOxygen Worker Runtime', () => {
  it('receives HTML from test worker', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler(() => {
          return new Response('<html><body>Hello, world</body></html>', {
            headers: {'content-type': 'text/html'},
          });
        });
      },
      async ({fetch}) => {
        const response = await fetch('/');

        expect(response.headers.get('content-type')).toEqual('text/html');
        await expect(response.text()).resolves.toEqual(
          '<html><body>Hello, world</body></html>',
        );
      },
    );
  });

  it('reloads script', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler((req, env) => new Response('foo'));
      },
      async ({fetch, writeHandler, miniOxygen}) => {
        let response = await fetch('/');
        await expect(response.text()).resolves.toEqual('foo');

        await writeHandler((req, env) => new Response('bar'));
        await miniOxygen.reload();

        response = await fetch('/');
        await expect(response.text()).resolves.toEqual('bar');
      },
    );
  });

  it('reloads environment variables', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler((req, env) => new Response(env.TEST));
        return {env: {TEST: 'foo'}};
      },
      async ({fetch, miniOxygen}) => {
        let response = await fetch('/');
        await expect(response.text()).resolves.toEqual('foo');

        await miniOxygen.reload({env: {TEST: 'bar'}});

        response = await fetch('/');
        await expect(response.text()).resolves.toEqual('bar');
      },
    );
  });

  it('serves a static asset via proxy', async () => {
    await withFixtures(
      async ({writeHandler, writeAsset}) => {
        await writeAsset(
          'star.svg',
          '<svg><polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:gold;"/></svg>',
        );

        await writeHandler(() => new Response('ok'));
      },
      async ({fetch, fetchAsset}) => {
        // Check asset server:
        const asset = await (await fetchAsset('/star.svg')).text();
        expect(asset).toEqual(
          '<svg><polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:gold;"/></svg>',
        );

        // Check asset proxy:
        const response = await fetch('/star.svg');
        const result = await response.text();

        expect(response.headers.get('content-type')).toEqual('image/svg+xml');
        expect(result).toEqual(asset);
      },
    );
  });

  it('adds Oxygen request headers', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler(
          (req) =>
            new Response(
              JSON.stringify(Object.fromEntries(req.headers.entries())),
              {headers: {'content-type': 'application/json'}},
            ),
        );
      },
      async ({fetch}) => {
        const response = await fetch('/');

        await expect(response.json()).resolves.toMatchObject({
          'request-id': expect.stringMatching(/^[a-z0-9-]{36}$/),
          'oxygen-buyer-ip': '127.0.0.1',
        });
      },
    );
  });

  it('applies sourcemaps to error stack traces', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler(
          () => {
            function doStuff() {
              throw new Error('test');
            }

            try {
              doStuff();
            } catch (error) {
              console.error(error);
              throw error;
            }

            return new Response('ok');
          },
          {sourcemap: true},
        );
      },
      async ({fetch, miniOxygen, miniOxygenOptions}) => {
        const spy = vi.spyOn(console, 'error').mockImplementation((error) => {
          // Hide logs
          // console.debug(error.stack);
        });

        const response = await fetch('/');

        expect(response.status).toEqual(500);
        await expect(response.text()).resolves.toEqual('Error: test');

        // console.error from workerd is asynchronous
        await vi.waitFor(() => expect(spy).toHaveBeenCalled());

        // console.error with stack:
        expect(spy).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            stack: expect.stringMatching(
              // Shows `doStuff` and the offending line by mapping
              // the minified code with sourcemaps:
              /Error: test\nthrow new Error\("test"\);\n.*at doStuff \(/s,
            ),
          }),
        );

        // Thrown error is also logged
        expect(spy).toHaveBeenNthCalledWith(2, new Error('test'));

        spy.mockClear();

        // -- Test without sourcemaps:

        await removeFile(miniOxygenOptions.buildPathWorkerFile + '.map');
        await miniOxygen.reload();

        await fetch('/');
        await vi.waitFor(() => expect(spy).toHaveBeenCalled());

        // console.error with stack:
        expect(spy, '').toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            stack: expect.stringMatching(
              // Doesn't show `doStuff` because it's minified
              /Error: test\n\s+at \w .*at Object\.fetch/s,
            ),
          }),
        );

        // Thrown error is also logged
        expect(spy).toHaveBeenNthCalledWith(2, new Error('test'));

        spy.mockRestore();
      },
    );
  });
});

// -- Test utilities:

type WriteFixture = (filename: string, content: string) => Promise<void>;

type WithFixturesSetupParams = {
  writeFixture: WriteFixture;
  writeAsset: WriteFixture;
  writeHandler: (
    handler: (
      request: Request,
      env: Record<string, any>,
      executionContext: ExecutionContext,
    ) => Response | Promise<Response>,
    options?: {sourcemap: boolean},
  ) => Promise<void>;
};

type WithFixturesTestParams = WithFixturesSetupParams & {
  fetch: (pathname: string) => Promise<Response>;
  fetchAsset: (pathname: string) => Promise<Response>;
  miniOxygen: MiniOxygenInstance;
  miniOxygenOptions: MiniOxygenOptions;
};

/**
 * Runs MiniOxygen in a temporary project directory.
 * @param setup Project setup before creating a MiniOxygen instance
 * @param runTest Test function that can fetch from MiniOxygen
 */
function withFixtures(
  setup: (
    params: WithFixturesSetupParams,
  ) => Promise<void | Partial<MiniOxygenOptions>>,
  runTest: (params: WithFixturesTestParams) => Promise<void>,
) {
  return inTemporaryDirectory(async (tmpDir) => {
    const relativeDistClient = joinPath('dist', 'client');
    const relativeDistWorker = joinPath('dist', 'worker');
    const relativeWorkerEntry = joinPath(relativeDistWorker, 'index.js');

    const writeFixture: WriteFixture = async (filename, content) => {
      const filepath = joinPath(tmpDir, filename);
      await touchFile(filepath);
      await writeFile(filepath, content);
    };
    const writeAsset: WriteFixture = (filepath, content) =>
      writeFixture(joinPath(relativeDistClient, filepath), content);

    const writeHandler = async (
      handler: Function,
      {sourcemap = false} = {},
    ) => {
      let code = `export default { fetch: ${handler.toString()} }`;

      if (sourcemap) {
        const result = await transformWithEsbuild(code, relativeWorkerEntry, {
          minify: true,
          sourcemap: true,
        });

        code = result.code;
        await writeFixture(
          relativeWorkerEntry + '.map',
          JSON.stringify(result.map),
        );
      }

      await writeFixture(relativeWorkerEntry, code);
    };

    const optionsFromSetup = await setup({
      writeFixture,
      writeAsset,
      writeHandler,
    });

    const miniOxygenOptions = {
      root: tmpDir,
      port: await getPort(),
      buildPathWorkerFile: joinPath(tmpDir, relativeWorkerEntry),
      buildPathClient: joinPath(tmpDir, relativeDistClient),
      inspectorPort: 9229,
      assetsPort: 1347,
      env: {},
      ...optionsFromSetup,
    };

    const miniOxygen = await startMiniOxygen(miniOxygenOptions, true);

    try {
      await runTest({
        writeFixture,
        writeHandler,
        writeAsset,
        miniOxygen,
        miniOxygenOptions,
        fetch: (pathname: string) => fetch(miniOxygen.listeningAt + pathname),
        fetchAsset: (pathname: string) =>
          fetch(buildAssetsUrl(miniOxygenOptions.assetsPort) + pathname),
      });
    } finally {
      await miniOxygen.close();
    }
  });
}
