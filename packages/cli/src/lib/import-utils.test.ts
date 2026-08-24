import {describe, it, expect, vi} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import {importVite, missingNativeBindingError} from './import-utils.js';

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

// The package manager is detected from lockfiles on disk. Pin it so the
// recovery steps are deterministic.
vi.mock(
  '@shopify/cli-kit/node/node-package-manager',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@shopify/cli-kit/node/node-package-manager')
      >();

    return {
      ...actual,
      getPackageManager: vi.fn(async () => 'pnpm' as const),
    };
  },
);

describe('importVite', () => {
  it('throws a handled AbortError when vite cannot be found in the project', async () => {
    const promise = importVite('/some/project/root');

    await expect(promise).rejects.toThrowError(AbortError);
    await expect(promise).rejects.toThrowError(
      /Could not find the 'vite' package/,
    );
  });
});

describe('missingNativeBindingError', () => {
  it('names the failing dependency and the project package manager', async () => {
    const error = new Error(
      'Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).',
    );
    error.stack = [
      'Error: Cannot find native binding.',
      '    at requireNative (/app/node_modules/rolldown/dist/shared/binding-CKyeQZen.mjs:597:34)',
    ].join('\n');

    const abortError = await missingNativeBindingError(error, '/app');
    const nextSteps = (abortError.nextSteps ?? []).join(' ');

    expect(abortError).toBeInstanceOf(AbortError);
    expect(abortError.message).toMatch(/'rolldown'/);
    expect(nextSteps).toMatch(/pnpm-lock\.yaml/);
    expect(nextSteps).toMatch(/pnpm install/);
  });

  it('reads the dependency name out of a pnpm store path', async () => {
    const error = new Error('Cannot find native binding.');
    error.stack = [
      'Error: Cannot find native binding.',
      '    at requireNative (/app/node_modules/.pnpm/@ast-grep+napi@0.34.1/node_modules/@ast-grep/napi/index.js:10:1)',
    ].join('\n');

    const abortError = await missingNativeBindingError(error, '/app');

    expect(abortError.message).toMatch(/'@ast-grep\/napi'/);
  });

  it('falls back to a generic message when the dependency is unknown', async () => {
    const error = new Error('Cannot find native binding.');
    error.stack = 'Error: Cannot find native binding.\n    at <anonymous>';

    const abortError = await missingNativeBindingError(error, '/app');

    expect(abortError).toBeInstanceOf(AbortError);
    expect(abortError.message).toMatch(/A dependency could not load/);
  });
});
