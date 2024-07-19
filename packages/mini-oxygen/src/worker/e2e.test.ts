import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  mkdir,
  writeFile,
  readFile,
  rm as remove,
  readdir,
} from 'node:fs/promises';
import {readdirSync} from 'node:fs';
import {temporaryDirectoryTask} from 'tempy';
import {it, vi, describe, expect} from 'vitest';
import esbuild from 'esbuild';
import {buildAssetsUrl} from './assets.js';
import {createMiniOxygen, type MiniOxygenOptions} from './index.js';
import {findPort} from '../common/find-port.js';
import {OXYGEN_CACHE_STATUS_HEADER} from '../cache/common.js';

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
      async ({fetch, writeHandler, reloadMiniOxygen}) => {
        let response = await fetch('/');
        await expect(response.text()).resolves.toEqual('foo');

        await writeHandler((req, env) => new Response('bar'));
        await reloadMiniOxygen();

        response = await fetch('/');
        await expect(response.text()).resolves.toEqual('bar');
      },
    );
  });

  it('reloads environment variables', async () => {
    await withFixtures(
      async ({writeHandler}) => {
        await writeHandler((req, env) => new Response(env.TEST));
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
        const spy = vi.spyOn(console, 'error').mockImplementation((error) => {
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

        await remove(miniOxygenOptions.sourceMapPath!, {force: true});
        await new Promise((resolve) => setTimeout(resolve, 100));
        await reloadMiniOxygen();
        await new Promise((resolve) => setTimeout(resolve, 100));

        await fetch('/');
        await vi.waitFor(
          () => expect(spy.mock.calls.length).toBeGreaterThan(1), // At least 2 calls
        );

        await vi.waitFor(() =>
          expect(spy, 'Logged without sourcemaps').toHaveBeenCalledWith(
            expect.objectContaining({
              stack: expect.stringMatching(
                // Doesn't show `doStuff` because it's minified
                /^Error:\s+test$/i,
              ),
            }),
          ),
        );

        // Thrown error is also logged
        expect(spy).toHaveBeenCalledWith(new Error('test'));

        spy.mockRestore();
      },
    );
  });

  describe('Oxygen Cache', () => {
    it('applies polyfill', async () => {
      await withFixtures(
        async ({writeHandler}) => {
          await writeHandler(
            async () => {
              const cache = await caches.open('test');
              return new Response(cache.constructor.name);
            },
            {useOxygenCache: true},
          );
        },
        async ({fetch}) => {
          const response = await fetch('/test-cache');
          // If the text is `Cache`, then it's using the native CF implementation
          await expect(response.text()).resolves.toMatchObject('OxygenCache');
        },
      );
    });

    it('caches by key', async () => {
      await withFixtures(
        async ({writeHandler}) => {
          await writeHandler(
            async (req) => {
              const cache = await caches.open('test');
              const cacheKey = new Request(req.url);
              const match = await cache.match(cacheKey);

              if (match) return match;

              await cache.put(
                cacheKey,
                Response.json(true, {
                  headers: {'cache-control': 'public, max-age=10'},
                }),
              );

              return Response.json(false);
            },
            {useOxygenCache: true},
          );
        },
        async ({fetch}) => {
          let response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(false);

          response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(true);
        },
      );
    });

    it('returns SWR headers', async () => {
      await withFixtures(
        async ({writeHandler}) => {
          await writeHandler(
            async (req) => {
              const cache = await caches.open('test');
              const cacheKey = new Request(req.url);
              const match = await cache.match(cacheKey);

              if (match) return match;

              await cache.put(
                cacheKey,
                Response.json(true, {
                  headers: {
                    'cache-control':
                      'public, max-age=1, stale-while-revalidate=10',
                  },
                }),
              );

              return Response.json(false);
            },
            {useOxygenCache: true},
          );
        },
        async ({fetch}) => {
          let response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(false);
          expect(response.headers.get(OXYGEN_CACHE_STATUS_HEADER)).toBeFalsy();

          response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(true);
          expect(response.headers.get(OXYGEN_CACHE_STATUS_HEADER)).toEqual(
            'HIT',
          );

          await new Promise((resolve) => setTimeout(resolve, 1000));

          response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(true);
          expect(response.headers.get(OXYGEN_CACHE_STATUS_HEADER)).toEqual(
            'STALE',
          );
        },
      );
    });

    it('deletes by tag', async () => {
      await withFixtures(
        async ({writeHandler}) => {
          await writeHandler(
            async (req) => {
              const cache = await caches.open('test');

              if (req.method === 'DELETE') {
                return Response.json(
                  await cache.delete(
                    new Request(req.url + 'non-matching-key', {
                      headers: [...req.headers],
                    }),
                  ),
                );
              }

              const cacheKey = new Request(req.url);
              const match = await cache.match(cacheKey);

              if (match) return match;

              await cache.put(
                cacheKey,
                Response.json(true, {
                  headers: {
                    'cache-control': 'public, max-age=10',
                    'cache-tags': 'tag1,tag2',
                  },
                }),
              );

              return Response.json(false);
            },
            {useOxygenCache: true},
          );
        },
        async ({fetch}) => {
          let response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(false);
          expect(response.headers.get(OXYGEN_CACHE_STATUS_HEADER)).toBeFalsy();

          response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(true);
          expect(response.headers.get(OXYGEN_CACHE_STATUS_HEADER)).toEqual(
            'HIT',
          );

          response = await fetch('/test-cache', {
            method: 'DELETE',
            headers: {'cache-tags': 'tag2'},
          });
          await expect(response.json()).resolves.toEqual(true);

          response = await fetch('/test-cache');
          await expect(response.json()).resolves.toEqual(false);
          expect(response.headers.get(OXYGEN_CACHE_STATUS_HEADER)).toBeFalsy(); // MISS
        },
      );
    });
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
    options?: {sourcemap?: boolean; useOxygenCache?: boolean},
  ) => Promise<void>;
};

type WithFixturesTestParams = WithFixturesSetupParams & {
  fetch: (pathname: string, init?: RequestInit) => Promise<Response>;
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
      await mkdir(path.dirname(filepath), {recursive: true});
      await writeFile(filepath, content, 'utf-8');
    };
    const writeAsset: WriteFixture = (filepath, content) =>
      writeFixture(path.join(relativeDistClient, filepath), content);

    const absoluteBundlePath = path.join(tmpDir, relativeWorkerEntry);
    let unstableOxygenCache = false;

    const writeHandler = async (
      handler: Function,
      {sourcemap = false, useOxygenCache = false} = {},
    ) => {
      let code = `export default { fetch: ${handler.toString()} }`;

      if (!sourcemap && !useOxygenCache) {
        await writeFixture(relativeWorkerEntry, code);
        return;
      }

      if (useOxygenCache) {
        unstableOxygenCache = true;
        code =
          `import '${fileURLToPath(
            new URL('../cache/polyfill.ts', import.meta.url),
          ).replace('.ts', '.js')}';\n` + code;
      }

      await esbuild.build({
        bundle: true,
        format: 'esm',
        minify: true,
        sourcemap: sourcemap ? 'external' : false,
        write: true,
        outfile: absoluteBundlePath,
        target: 'esnext',
        keepNames: true, // Important to keep the class name OxygenCache
        stdin: {
          contents: code,
          sourcefile: relativeWorkerEntry,
          loader: 'ts',
          resolveDir: '.',
        },
      });
    };

    const optionsFromSetup = await setup({
      writeFixture,
      writeAsset,
      writeHandler,
    });

    const miniOxygenOptions = {
      unstableOxygenCache,
      requestHook: null,
      sourceMapPath: path.join(tmpDir, relativeWorkerEntry + '.map'),
      assets: {
        directory: path.join(tmpDir, relativeDistClient),
        port: await findPort(1347),
      },
      workers: [
        {
          name: 'test',
          modulesRoot: path.dirname(absoluteBundlePath),
          modules: [
            {
              type: 'ESModule',
              path: absoluteBundlePath,
              contents: await readFile(absoluteBundlePath, 'utf-8'),
            },
          ],
          bindings: {...optionsFromSetup?.bindings},
        },
      ],
    } satisfies MiniOxygenOptions;

    const miniOxygen = createMiniOxygen(miniOxygenOptions);
    const {workerUrl} = await miniOxygen.ready;

    const reloadMiniOxygen = async (options: ReloadOptions = {}) => {
      await miniOxygen.reload(async ({workers}) => {
        const testWorker = workers[0];
        Object.assign(testWorker, options);

        if (Array.isArray(testWorker.modules)) {
          // Reload contents
          testWorker.modules[0].contents = await readFile(
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
        fetch: (pathname: string, init) =>
          fetch(workerUrl.origin + pathname, init),
        fetchAsset: (pathname: string) =>
          fetch(buildAssetsUrl(miniOxygenOptions.assets.port) + pathname),
      });
    } finally {
      await miniOxygen.dispose();
    }
  });
}
