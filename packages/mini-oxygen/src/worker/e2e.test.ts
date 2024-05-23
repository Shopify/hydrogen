import path from 'node:path';
import fs from 'node:fs/promises';
import {ensureFile as touchFile, remove as removeFile} from 'fs-extra/esm';
import {temporaryDirectoryTask} from 'tempy';
import {it, vi, describe, expect} from 'vitest';
import {transformWithEsbuild} from 'vite';
import {buildAssetsUrl} from './assets.js';
import {createMiniOxygen, type MiniOxygenOptions} from './index.js';

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
        await writeHandler(() => new Response('foo'));
      },
      async ({fetch, writeHandler, reloadMiniOxygen}) => {
        let response = await fetch('/');
        await expect(response.text()).resolves.toEqual('foo');

        await writeHandler(() => new Response('bar'));
        await reloadMiniOxygen();

        response = await fetch('/');
        await expect(response.text()).resolves.toEqual('bar');
      },
    );
  });

  it('reloads environment variables', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler((_req, env) => new Response(env.TEST));
        return {bindings: {TEST: 'foo'}};
      },
      async ({fetch, reloadMiniOxygen}) => {
        let response = await fetch('/');
        await expect(response.text()).resolves.toEqual('foo');

        await reloadMiniOxygen({bindings: {TEST: 'bar'}});

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
      async ({fetch, reloadMiniOxygen, miniOxygenOptions}) => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {
          // Hide logs
          // console.debug(error.stack);
        });

        const response = await fetch('/');

        expect(response.status).toEqual(500);
        await expect(response.text()).resolves.toEqual('Error: test');

        // console.error from workerd is asynchronous
        await vi.waitFor(
          () => expect(spy.mock.calls.length).toBeGreaterThan(1), // At least 2 calls
        );

        // Note: Logs come in random order due to the fact that
        // workerd logs are ingested using the Inspector protocol,
        // which is based on WebSockets. We can't guarantee the order
        // until we start using stdio for logging.

        // console.error with stack:
        expect(spy, 'Logged with sourcemaps').toHaveBeenCalledWith(
          expect.objectContaining({
            stack: expect.stringMatching(
              // Shows `doStuff` and the offending line by mapping
              // the minified code with sourcemaps:
              /Error: test\nthrow new Error\("test"\);\n.*at doStuff \(/s,
            ),
          }),
        );

        // Thrown error is also logged
        expect(spy).toHaveBeenCalledWith(new Error('test'));

        spy.mockClear();

        // -- Test without sourcemaps:

        await removeFile(miniOxygenOptions.sourceMapPath!);
        await reloadMiniOxygen();

        await fetch('/');
        await vi.waitFor(
          () => expect(spy.mock.calls.length).toBeGreaterThan(1), // At least 2 calls
        );

        // console.error with stack:
        expect(spy, 'Logged without sourcemaps').toHaveBeenCalledWith(
          expect.objectContaining({
            stack: expect.stringMatching(
              // Doesn't show `doStuff` because it's minified
              /Error: test\n\s+at \w .*at Object\.fetch/s,
            ),
          }),
        );

        // Thrown error is also logged
        expect(spy).toHaveBeenCalledWith(new Error('test'));

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
  reloadMiniOxygen: (options?: ReloadOptions) => Promise<void>;
  miniOxygenOptions: Partial<MiniOxygenOptions>;
};

type ReloadOptions = Pick<MiniOxygenOptions['workers'][0], 'bindings'>;

/**
 * Runs MiniOxygen in a temporary project directory.
 * @param setup Project setup before creating a MiniOxygen instance
 * @param runTest Test function that can fetch from MiniOxygen
 */
function withFixtures(
  setup: (
    params: WithFixturesSetupParams,
  ) => Promise<void | Partial<ReloadOptions>>,
  runTest: (params: WithFixturesTestParams) => Promise<void>,
) {
  return temporaryDirectoryTask(async (tmpDir) => {
    const relativeDistClient = path.join('dist', 'client');
    const relativeDistWorker = path.join('dist', 'worker');
    const relativeWorkerEntry = path.join(relativeDistWorker, 'index.js');

    const writeFixture: WriteFixture = async (filename, content) => {
      const filepath = path.join(tmpDir, filename);
      await touchFile(filepath);
      await fs.writeFile(filepath, content, 'utf-8');
    };
    const writeAsset: WriteFixture = (filepath, content) =>
      writeFixture(path.join(relativeDistClient, filepath), content);

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

    const absoluteBundlePath = path.join(tmpDir, relativeWorkerEntry);

    const miniOxygenOptions = {
      assets: {
        directory: path.join(tmpDir, relativeDistClient),
        port: 1347,
      },
      workers: [
        {
          name: 'test',
          modulesRoot: path.dirname(absoluteBundlePath),
          modules: [
            {
              type: 'ESModule',
              path: absoluteBundlePath,
              contents: await fs.readFile(absoluteBundlePath, 'utf-8'),
            },
          ],
          bindings: {...optionsFromSetup?.bindings},
        },
      ],
      sourceMapPath: path.join(tmpDir, relativeWorkerEntry + '.map'),
      requestHook: null,
    } satisfies MiniOxygenOptions;

    const miniOxygen = createMiniOxygen(miniOxygenOptions);
    const {workerUrl} = await miniOxygen.ready;

    const reloadMiniOxygen = async (options: ReloadOptions = {}) => {
      await miniOxygen.reload(async ({workers}) => {
        const testWorker = workers[0];
        Object.assign(testWorker, options);

        if (Array.isArray(testWorker.modules)) {
          // Reload contents
          testWorker.modules[0].contents = await fs.readFile(
            absoluteBundlePath,
            'utf-8',
          );
        }

        return {workers};
      });
    };

    try {
      await runTest({
        writeFixture,
        writeHandler,
        writeAsset,
        reloadMiniOxygen,
        miniOxygenOptions,
        fetch: (pathname: string) => fetch(workerUrl.origin + pathname),
        fetchAsset: (pathname: string) =>
          fetch(buildAssetsUrl(miniOxygenOptions.assets.port) + pathname),
      });
    } finally {
      await miniOxygen.dispose();
    }
  });
}
