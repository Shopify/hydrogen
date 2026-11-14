import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, describe, expect, it} from 'vitest';
import {build} from 'tsup';
import {createServer} from 'vite';
import {createMiniOxygen, Request} from '../worker/index.js';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, {recursive: true, force: true});
  }
});

describe('Mini Oxygen concurrent module loads', () => {
  it('serves concurrent requests while the entry module is loading', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mini-oxygen-concurrent-'));
    tempRoots.push(root);
    const workerOutput = join(root, 'worker');
    const workerEntry = fileURLToPath(
      new URL('./worker-entry.ts', import.meta.url),
    );
    const entryModule = join(root, 'server.ts');

    const invokeGate = Promise.withResolvers<void>();
    const invokeStarted = Promise.withResolvers<void>();
    let invokeCount = 0;

    const requestGate = Promise.withResolvers<void>();
    let requestCount = 0;
    const allRequestsEntered = Promise.withResolvers<void>();

    writeFileSync(
      join(root, 'server.ts'),
      `export default {
        fetch: async () => {
          const {message} = await import('./message.ts');
          return new Response(message);
        },
      };`,
    );
    writeFileSync(join(root, 'message.ts'), `export const message = 'ok';`);

    await build({
      entry: [workerEntry],
      outDir: workerOutput,
      format: ['esm'],
      platform: 'neutral',
      target: 'es2022',
      noExternal: [/./],
      dts: false,
      silent: true,
    });

    const vite = await createServer({
      configFile: false,
      root,
      logLevel: 'silent',
      appType: 'custom',
      ssr: {noExternal: true, target: 'webworker'},
      server: {middlewareMode: true},
    });
    let miniOxygen: ReturnType<typeof createMiniOxygen> | undefined;

    try {
      miniOxygen = createMiniOxygen({
        workers: [
          {
            name: 'vite-env',
            modulesRoot: '/',
            modules: [
              {type: 'ESModule', path: join(workerOutput, 'worker-entry.js')},
            ],
            serviceBindings: {
              __VITE_INVOKE_MODULE: async (request: Request) => {
                if (++invokeCount === 1) {
                  invokeStarted.resolve();
                  await invokeGate.promise;
                }
                const payload = await request.json();
                const result = await vite.environments['ssr'].hot.handleInvoke(
                  payload as any,
                );
                return new Response(JSON.stringify(result), {
                  headers: {'Content-Type': 'application/json'},
                });
              },
            },
            durableObjects: {
              __VITE_RUNNER_OBJECT: 'ViteModuleRunnerObject',
            },
            bindings: {
              __VITE_RUNTIME_EXECUTE_URL: entryModule,
              __VITE_WARMUP_PATHNAME: '/__vite_warmup',
            },
            unsafeEvalBinding: '__VITE_UNSAFE_EVAL',
            wrappedBindings: {__VITE_SETUP_ENV: 'setup-environment'},
          },
          {
            name: 'setup-environment',
            modules: true,
            serviceBindings: {
              __TEST_REQUEST_GATE: async () => {
                if (++requestCount === 8) {
                  allRequestsEntered.resolve();
                  requestGate.resolve();
                }
                await requestGate.promise;
                return new Response(null);
              },
            },
            script: `export default (env) => async () => {
              await env.__TEST_REQUEST_GATE.fetch(new Request('http://mini-oxygen'));
            };`,
          },
        ],
      });

      const {workerUrl} = await miniOxygen.ready;
      const pendingResponses = Array.from({length: 8}, () =>
        fetch(new URL('/robots.txt', workerUrl)),
      );
      await allRequestsEntered.promise;
      await invokeStarted.promise;
      await new Promise<void>((resolve) => setImmediate(resolve));
      invokeGate.resolve();

      const responses = await Promise.all(pendingResponses);
      const responseBodies = await Promise.all(
        responses.map((response) => response.text()),
      );

      expect(
        responses.map((response) => response.status),
        responseBodies.join('\n---\n'),
      ).toEqual(Array(8).fill(200));
      expect(responseBodies).toEqual(Array(8).fill('ok'));
    } finally {
      await Promise.all([miniOxygen?.dispose(), vite.close()]);
    }
  });
});
