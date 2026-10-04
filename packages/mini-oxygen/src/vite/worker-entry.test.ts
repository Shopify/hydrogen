import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  importModule: vi.fn(),
  runnerObjectImport: vi.fn(),
  runnerObjectCallback: vi.fn(),
  runnerEvaluators: [] as any[],
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

import * as workerEntryModule from './worker-entry.js';
import workerEntry, {
  ViteModuleRunnerObject,
  type ViteEnv,
} from './worker-entry.js';

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
  } as ViteEnv;

  const runnerObject = new ViteModuleRunnerObject(
    {} as DurableObjectState,
    env,
  );
  env.__VITE_RUNNER_OBJECT__ = {
    get: () => ({
      importModule: async (...args: [string, number]) => {
        mocks.runnerObjectImport(...args);
        return runnerObject.importModule(...args);
      },
      executeCallback: async (...args: [number]) => {
        mocks.runnerObjectCallback(...args);
        return runnerObject.executeCallback(...args);
      },
    }),
  };

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
  beforeEach(() => {
    mocks.importModule.mockReset();
    mocks.runnerObjectImport.mockReset();
    mocks.runnerObjectCallback.mockReset();
  });

  it('only exposes the worker handler at runtime', () => {
    expect(Object.keys(workerEntryModule)).toEqual([
      'default',
      'ViteModuleRunnerObject',
    ]);
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

  it('loads the app entry through the runner object for concurrent requests', async () => {
    let resolveImport!: (module: unknown) => void;
    mocks.importModule.mockReturnValue(
      new Promise((resolve) => {
        resolveImport = resolve;
      }),
    );

    const pendingResponses = Array.from({length: 8}, (_, index) =>
      workerEntry.fetch(
        new Request(`http://localhost/products/${index}`),
        createEnv('./server'),
        {} as ExecutionContext,
      ),
    );
    await Promise.resolve();

    expect(mocks.runnerObjectImport).toHaveBeenCalledTimes(8);
    resolveImport({
      default: {fetch: vi.fn(async () => new Response('ok'))},
    });
    const responses = await Promise.all(pendingResponses);

    expect(responses.map((response) => response.status)).toEqual(
      Array(8).fill(200),
    );
    expect(mocks.runnerObjectImport).toHaveBeenCalledTimes(8);
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
