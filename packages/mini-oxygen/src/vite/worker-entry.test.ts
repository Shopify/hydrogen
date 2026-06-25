import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  importModule: vi.fn(),
}));

vi.mock('vite/module-runner', () => ({
  EvaluatedModuleNode: class {},
  ModuleRunner: vi.fn(() => ({
    import: mocks.importModule,
  })),
  ssrModuleExportsKey: Symbol.for('ssrModuleExportsKey'),
}));

import * as workerEntryModule from './worker-entry.js';
import workerEntry, {type ViteEnv} from './worker-entry.js';
import {MISSING_SSR_ENTRY_ERROR} from './worker-entry-errors.js';

function createEnv(entry: string): ViteEnv {
  return {
    __VITE_INVOKE_MODULE: {fetch: vi.fn()},
    __VITE_RUNTIME_EXECUTE_URL: entry,
    __VITE_WARMUP_PATHNAME: '/__vite_warmup',
    __VITE_SETUP_ENV: vi.fn(),
    __VITE_UNSAFE_EVAL: {
      eval: vi.fn(),
      newFunction: vi.fn(),
      newAsyncFunction: vi.fn(),
    },
  };
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
  });

  it('only exposes the worker handler at runtime', () => {
    expect(Object.keys(workerEntryModule)).toEqual(['default']);
  });

  it('returns a clear Mini Oxygen error when the default entry is missing', async () => {
    const viteError =
      'Failed to load url ./server (resolved id: ./server). Does the file exist?';
    const error = new Error(viteError);

    const body = await dispatchWithEntrypointError('./server', error);

    expect(body).toContain(MISSING_SSR_ENTRY_ERROR);
    expect(body).toContain('oxygen({ entry: "./server" })');
    expect(body).toContain(viteError);
  });

  it('returns a clear Mini Oxygen error when a configured entry is missing', async () => {
    const entry = 'virtual:oxygen-framework-entry';
    const viteError = `Failed to load url ${entry} (resolved id: ${entry}). Does the file exist?`;
    const error = new Error(viteError);

    const body = await dispatchWithEntrypointError(entry, error);

    expect(body).toContain(MISSING_SSR_ENTRY_ERROR);
    expect(body).toContain(
      'oxygen({ entry: "virtual:oxygen-framework-entry" })',
    );
    expect(body).toContain(viteError);
  });

  it('keeps server entry runtime errors unchanged', async () => {
    const error = new Error('The default entry failed after it loaded.');

    const body = await dispatchWithEntrypointError('./server', error);

    expect(body).not.toContain(MISSING_SSR_ENTRY_ERROR);
    expect(body).toContain(error.message);
  });

  it('ignores server mentions outside the error headline', async () => {
    const error = new Error('The default entry failed after it loaded.');
    error.stack = [
      'Error: The default entry failed after it loaded.',
      "    at import('./server')",
    ].join('\n');

    const body = await dispatchWithEntrypointError('./server', error);

    expect(body).not.toContain(MISSING_SSR_ENTRY_ERROR);
    expect(body).toContain(error.message);
  });
});
