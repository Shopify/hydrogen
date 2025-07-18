import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {checkRemixVersions} from './remix-version-check.js';

let mockRequire: any;
let mockResolve: any;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequire = vi.fn();
  mockResolve = vi.fn();
});

vi.mock('node:module', () => {
  return {
    createRequire: () => {
      const require = (mod: string) => {
        if (mod === 'semver/functions/satisfies.js') {
          return (version: string, range: string) => {
            // Simple mock implementation
            return version.startsWith('7.7') && range.includes('7.7');
          };
        }
        return mockRequire(mod);
      };
      require.resolve = mockResolve;
      return require;
    },
  };
});

describe('remix-version-check', () => {
  it('does nothing when versions are in sync', () => {
    // Mock React Router packages with correct versions
    mockResolve.mockImplementation((pkg: string) => {
      if (pkg === 'react-router/package.json') {
        return '/fake/path/react-router/package.json';
      }
      throw new Error('Module not found');
    });

    mockRequire.mockImplementation((path: string) => {
      if (path.includes('react-router/package.json')) {
        return { version: '7.7.0' };
      }
      return {};
    });

    const outputMock = mockAndCaptureOutput();
    checkRemixVersions('/fake/project');

    expect(outputMock.warn()).toBe('');
  });

  it('warns when React Router versions are out of sync', () => {
    // Mock outdated React Router version
    mockResolve.mockImplementation((pkg: string) => {
      if (pkg === 'react-router/package.json') {
        return '/fake/path/react-router/package.json';
      }
      throw new Error('Module not found');
    });

    mockRequire.mockImplementation((path: string) => {
      if (path.includes('react-router/package.json')) {
        return { version: '6.0.0' }; // Outdated version
      }
      return {};
    });

    const outputMock = mockAndCaptureOutput();
    checkRemixVersions('/fake/project');

    const output = outputMock.warn();
    expect(output).toMatch(`Hydrogen requires React Router @^7.7.0`);
    expect(output).toMatch(`react-router@6.0.0`);
  });

  it('warns when Remix versions are out of sync (legacy)', () => {
    // Mock a project without React Router packages to test Remix fallback
    mockResolve.mockImplementation((pkg: string) => {
      if (pkg.includes('react-router') || pkg.includes('@react-router')) {
        throw new Error('Module not found');
      }
      if (pkg === '@remix-run/dev/package.json') {
        return '/fake/path/@remix-run/dev/package.json';
      }
      if (pkg === '@remix-run/react/package.json') {
        return '/fake/path/@remix-run/react/package.json';
      }
      throw new Error('Module not found');
    });

    mockRequire.mockImplementation((path: string) => {
      if (path.includes('@remix-run/dev')) {
        return { version: '2.0.0' };
      }
      if (path.includes('@remix-run/react')) {
        return { version: '2.0.0' };
      }
      return {};
    });

    const expectedVersion = '42.0.0-test';
    const outputMock = mockAndCaptureOutput();
    checkRemixVersions('/fake/project', expectedVersion);

    const output = outputMock.warn();
    expect(output).toMatch(`Hydrogen requires Remix @${expectedVersion}`);
    expect(output).toMatch(`@remix-run/dev@`);
    expect(output).toMatch(`@remix-run/react@`);
  });
});
