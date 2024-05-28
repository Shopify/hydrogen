import {describe, it, expect, vi} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {checkRemixVersions} from './remix-version-check.js';
import { cwd } from '@shopify/cli-kit/node/path';

const requireMock = vi.fn();
vi.mock('node:module', async () => {
  const {createRequire} = await vi.importActual<typeof import('node:module')>(
    'node:module',
  );

  return {
    createRequire: (url: string) => {
      const actualRequire = createRequire(url);
      requireMock.mockImplementation((mod: string) => actualRequire(mod));
      const require = requireMock as unknown as typeof actualRequire;
      require.resolve = actualRequire.resolve.bind(actualRequire);

      return require;
    },
  };
});

describe('remix-version-check', () => {
  it('does nothing when versions are in sync', () => {
    const outputMock = mockAndCaptureOutput();
    checkRemixVersions(cwd());

    expect(outputMock.warn()).toBe('');
  });

  it('warns when versions are out of sync', () => {
    const expectedVersion = '42.0.0-test';
    vi.mocked(requireMock).mockReturnValueOnce({
      // Hydrogen expected version
      peerDependencies: {'@remix-run/dev': expectedVersion},
    });

    const outputMock = mockAndCaptureOutput();
    checkRemixVersions(cwd());

    const output = outputMock.warn();
    expect(output).toMatch(`Hydrogen requires Remix @${expectedVersion}`);
    expect(output).toMatch(`@remix-run/dev@`);
    expect(output).toMatch(`@remix-run/react@`);
  });
});
