import {AsyncLocalStorage} from 'node:async_hooks';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  importModule: vi.fn(),
  runnerObjectImport: vi.fn(),
  runnerObjectCallback: vi.fn(),
  runnerEvaluators: [] as any[],
  getIoContext: vi.fn(),
}));

vi.mock('vite/module-runner', () => ({
  EvaluatedModuleNode: class {},
  ModuleRunner: vi.fn((_, evaluator) => {
    mocks.runnerEvaluators.push(evaluator);
    return {import: mocks.importModule};
  }),
  ssrDynamicImportKey: '__vite_ssr_dynamic_import__',
  ssrModuleExportsKey: '__vite_ssr_exports__',
}));

import type {ViteEnv} from './worker-entry.js';

type RunnerObject = {
  fetch(request: Request): Promise<Response>;
};

type WorkerEntryModule = typeof import('./worker-entry.js');

const ioContext = new AsyncLocalStorage<string>();
let workerEntryModule: WorkerEntryModule;
let workerEntry: WorkerEntryModule['default'];

function createEnv(entry: string): ViteEnv {
  const env = {
    __VITE_INVOKE_MODULE: {fetch: vi.fn()},
    __VITE_RUNTIME_EXECUTE_URL: entry,
    __VITE_WARMUP_PATHNAME: '/__vite_warmup',
    __VITE_SETUP_ENV: vi.fn(),
    __VITE_UNSAFE_EVAL: {
      eval: vi.fn(() => async () => {}),
      newFunction: vi.fn(),
      newAsyncFunction: vi.fn(),
    },
  } as unknown as ViteEnv;

  const RunnerObject = (
    workerEntryModule as unknown as {
      ViteModuleRunnerObject?: new (
        state: unknown,
        env: ViteEnv,
      ) => RunnerObject;
    }
  ).ViteModuleRunnerObject;

  if (RunnerObject) {
    const runnerObject = new RunnerObject({}, env);
    env.__VITE_RUNNER_OBJECT = {
      idFromName: (name) => name,
      get: () => ({
        fetch: async (request) => {
          const {pathname} = new URL(request.url);
          const args = (await request.clone().json()) as unknown[];

          if (pathname === '/importModule') {
            mocks.runnerObjectImport(...(args as [string, number]));
          } else if (pathname === '/executeCallback') {
            mocks.runnerObjectCallback(...(args as [number]));
          }

          return ioContext.run('runner-object', () =>
            runnerObject.fetch(request),
          );
        },
      }),
    };
  }

  return env;
}

async function dispatchWithEntrypointError(entry: string, error: Error) {
  mocks.importModule.mockRejectedValueOnce(error);

  const response = await workerEntry.fetch(
    new Request('http://localhost/products'),
    createEnv(entry),
    {} as ExecutionContext,
  );

  return response.text();
}

describe('worker entry', () => {
  beforeEach(async () => {
    vi.resetModules();
    mocks.importModule.mockReset();
    mocks.runnerObjectImport.mockReset();
    mocks.runnerObjectCallback.mockReset();
    mocks.runnerEvaluators.length = 0;
    mocks.getIoContext.mockImplementation(() => ioContext.getStore());
    workerEntryModule = await import('./worker-entry.js');
    workerEntry = workerEntryModule.default;
  });

  it('only exposes the worker handler and runner object at runtime', () => {
    expect(Object.keys(workerEntryModule)).toEqual([
      'default',
      'ViteModuleRunnerObject',
    ]);
  });

  it('keeps concurrent imports in the runner object I/O context', async () => {
    const importResult = Promise.withResolvers<unknown>();
    let ownerContext: string | undefined;
    let pendingImport: Promise<unknown> | undefined;

    mocks.importModule.mockImplementation(() => {
      const currentContext = mocks.getIoContext() as string | undefined;

      if (!pendingImport) {
        ownerContext = currentContext;
        pendingImport = importResult.promise;
      } else if (currentContext !== ownerContext) {
        return Promise.reject(
          new Error('Cannot perform I/O on behalf of a different request'),
        );
      }

      return pendingImport;
    });

    const pendingResponses = Array.from({length: 8}, (_, index) =>
      ioContext.run(`request-${index}`, () =>
        workerEntry.fetch(
          new Request(`http://localhost/products/${index}`),
          createEnv('./server'),
          {} as ExecutionContext,
        ),
      ),
    );

    await vi.waitFor(() => {
      expect(mocks.importModule).toHaveBeenCalledTimes(8);
    });
    importResult.resolve({
      default: {fetch: vi.fn(async () => new Response('ok'))},
    });

    const responses = await Promise.all(pendingResponses);

    expect(responses.map((response) => response.status)).toEqual(
      Array(8).fill(200),
    );
    expect(ownerContext).toBe('runner-object');
    expect(mocks.runnerObjectImport).toHaveBeenCalledTimes(8);
  });

  it('returns a clear Mini Oxygen error when the default entry is missing', async () => {
    const viteError =
      'Failed to load url ./server (resolved id: ./server). Does the file exist?';
    const error = new Error(viteError);

    const body = await dispatchWithEntrypointError('./server', error);

    expect(body).toContain('No Oxygen worker entry was found.');
    expect(body).toContain('oxygen({ entry: "./server" })');
    expect(body).toContain(viteError);
  });

  it('returns a clear Mini Oxygen error when a configured entry is missing', async () => {
    const entry = 'virtual:oxygen-framework-entry';
    const viteError = `Failed to load url ${entry} (resolved id: ${entry}). Does the file exist?`;
    const error = new Error(viteError);

    const body = await dispatchWithEntrypointError(entry, error);

    expect(body).toContain('No Oxygen worker entry was found.');
    expect(body).toContain(
      'oxygen({ entry: "virtual:oxygen-framework-entry" })',
    );
    expect(body).toContain(viteError);
  });

  it('keeps server entry runtime errors unchanged', async () => {
    const error = new Error('The default entry failed after it loaded.');

    const body = await dispatchWithEntrypointError('./server', error);

    expect(body).not.toContain('No Oxygen worker entry was found.');
    expect(body).toContain(error.message);
  });

  it('ignores server mentions outside the error headline', async () => {
    const error = new Error('The default entry failed after it loaded.');
    error.stack = [
      'Error: The default entry failed after it loaded.',
      "    at import('./server')",
    ].join('\n');

    const body = await dispatchWithEntrypointError('./server', error);

    expect(body).not.toContain('No Oxygen worker entry was found.');
    expect(body).toContain(error.message);
  });

  it('executes dynamic imports through the runner object', async () => {
    mocks.importModule.mockResolvedValue({
      default: {fetch: vi.fn(async () => new Response('ok'))},
    });
    const env = createEnv('./server');
    await workerEntry.fetch(
      new Request('http://localhost/products'),
      env,
      {} as ExecutionContext,
    );

    const originalDynamicImport = vi.fn(async (dependency: string) => ({
      dependency,
    }));
    const context = {
      __vite_ssr_dynamic_import__: originalDynamicImport,
      __vite_ssr_exports__: {},
    };
    const evaluator = mocks.runnerEvaluators[0];
    await evaluator.runInlinedModule(context, '', {id: './server'});

    await expect(
      context.__vite_ssr_dynamic_import__('./route.js'),
    ).resolves.toEqual({dependency: './route.js'});
    expect(originalDynamicImport).toHaveBeenCalledWith('./route.js');
    expect(mocks.runnerObjectCallback).toHaveBeenCalledOnce();
  });
});
