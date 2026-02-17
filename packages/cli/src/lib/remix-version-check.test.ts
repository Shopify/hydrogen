import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {checkRemixVersions} from './remix-version-check.js';
import {cwd} from '@shopify/cli-kit/node/path';

const requireMock = vi.fn();
const resolveMock = vi.fn();

vi.mock('node:module', async () => {
  const {createRequire} =
    await vi.importActual<typeof import('node:module')>('node:module');

  return {
    createRequire: (url: string) => {
      const actualRequire = createRequire(url);
      const mockRequire = (mod: string) => {
        return requireMock(mod, actualRequire);
      };
      mockRequire.resolve = (mod: string, options?: any) => {
        return resolveMock(mod, options, actualRequire);
      };

      return mockRequire as unknown as typeof actualRequire;
    },
  };
});

describe('remix-version-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when versions are in sync', () => {
    // Mock that no Remix packages are found (simulating React Router setup)
    resolveMock.mockImplementation((_mod, _options, actualRequire) => {
      throw new Error('Cannot find module');
    });

    requireMock.mockImplementation((mod, actualRequire) => {
      return actualRequire(mod);
    });

    const outputMock = mockAndCaptureOutput();
    checkRemixVersions(cwd());

    expect(outputMock.warn()).toBe('');
  });

  it('warns when versions are out of sync', () => {
    const expectedVersion = '42.0.0-test';

    // Mock Remix packages with version 2.0.0 (which won't match 42.0.0-test)
    resolveMock.mockImplementation((mod, _options, actualRequire) => {
      if (mod.includes('@remix-run/') && mod.includes('/package.json')) {
        return `/fake/path/node_modules/${mod}`;
      }
      return actualRequire.resolve(mod);
    });

    requireMock.mockImplementation((mod, actualRequire) => {
      if (mod.includes('@remix-run/') && mod.includes('/package.json')) {
        return {version: '2.0.0'};
      }
      return actualRequire(mod);
    });

    const outputMock = mockAndCaptureOutput();
    checkRemixVersions(cwd(), expectedVersion);

    const output = outputMock.warn();
    expect(output).toMatch(`Hydrogen requires Remix @${expectedVersion}`);
    expect(output).toMatch(`@remix-run/dev@`);
    expect(output).toMatch(`@remix-run/react@`);
  });
});
