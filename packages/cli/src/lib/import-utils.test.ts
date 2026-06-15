import {describe, it, expect, vi} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import {importVite} from './import-utils.js';

// Force `require.resolve('vite', ...)` to fail with MODULE_NOT_FOUND so we can
// exercise the missing-vite path deterministically, while delegating every
// other resolution to the real implementation.
vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();

  return {
    ...actual,
    createRequire(filename: string | URL) {
      const realRequire = actual.createRequire(filename);
      const wrapped = ((...args: Parameters<typeof realRequire>) =>
        realRequire(...args)) as NodeRequire;
      Object.assign(wrapped, realRequire);

      const resolve = ((request: string, options?: {paths?: string[]}) => {
        if (request === 'vite') {
          const error = new Error("Cannot find module 'vite'") as Error & {
            code?: string;
          };
          error.code = 'MODULE_NOT_FOUND';
          throw error;
        }

        return realRequire.resolve(request, options);
      }) as NodeRequire['resolve'];
      resolve.paths = realRequire.resolve.paths.bind(realRequire.resolve);
      wrapped.resolve = resolve;

      return wrapped;
    },
  };
});

describe('importVite', () => {
  it('throws a handled AbortError when vite cannot be found in the project', async () => {
    const promise = importVite('/some/project/root');

    await expect(promise).rejects.toThrowError(AbortError);
    await expect(promise).rejects.toThrowError(
      /Could not find the 'vite' package/,
    );
  });
});
