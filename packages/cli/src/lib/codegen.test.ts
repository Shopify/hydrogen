import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockedFunction,
} from 'vitest';
import {generateDefaultConfig, executeReactRouterCodegen} from './codegen.js';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import type {execSync, exec} from 'child_process';

// Mock @shopify/cli-kit/node/ui module
vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderInfo: vi.fn(),
    renderWarning: vi.fn(),
  };
});

function writeGraphQLConfig(filepath: string, config: Object) {
  return writeFile(
    joinPath(filepath, '.graphqlrc.ts'),
    `export default ${JSON.stringify(config)}`,
  );
}

describe('Codegen', () => {
  describe('without a GraphQL config', () => {
    it('generates a default Codegen config including SFAPI', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'storefrontapi.generated.d.ts': {
                preset: expect.any(Object),
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: expect.arrayContaining([expect.any(String)]),
              },
            },
          },
        });
      });
    });
  });

  describe('with an existing GraphQL config', () => {
    it('overwrites default options when specified in the matching project', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            default: {
              schema: 'anything/storefront.schema.json',
              documents: ['somewhere'],
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toMatchObject({
          config: {
            generates: {
              'storefrontapi.generated.d.ts': {
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: ['somewhere'],
              },
            },
          },
        });
      });
    });

    it('overwrites default options when specified in the Codegen extension', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            default: {
              schema: 'anything/storefront.schema.json',
              extensions: {
                codegen: {
                  generates: {
                    'different.generated.d.ts': {
                      preset: {},
                      documents: ['somewhere'],
                    },
                  },
                },
              },
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'different.generated.d.ts': expect.objectContaining({
                preset: expect.any(Object),
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: ['somewhere'],
              }),
            },
          },
        });
      });
    });

    it('includes CAAPI when it is listed in the GraphQL projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            customer: {
              schema: 'anything/customer-account.schema.json',
              documents: ['somewhere'],
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'storefrontapi.generated.d.ts': {
                preset: expect.any(Object),
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: expect.arrayContaining([expect.any(String)]),
              },
              'customer-accountapi.generated.d.ts': {
                preset: expect.any(Object),
                schema: expect.stringMatching(
                  /\/customer-account\.schema\.json$/,
                ),
                documents: expect.arrayContaining(['somewhere']),
              },
            },
          },
        });
      });
    });

    it('includes unknown Codegen projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            invalidCodegen: {
              schema: 'https://somewhere.com',
              documents: ['somewhere'],
            },
            validCodegen: {
              schema: 'https://somewhere.com',
              documents: ['somewhere'],
              extensions: {
                codegen: {
                  generates: {'test.generated.d.ts': {preset: {}}},
                },
              },
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'storefrontapi.generated.d.ts': expect.any(Object),
              'test.generated.d.ts': expect.objectContaining({
                schema: 'https://somewhere.com',
                documents: ['somewhere'],
                preset: expect.any(Object),
              }),
            },
          },
        });
      });
    });
  });
});

describe('executeReactRouterCodegen', () => {
  let execSyncMock: MockedFunction<typeof execSync>;
  let execMock: MockedFunction<typeof exec>;

  beforeEach(() => {
    vi.mock('child_process', () => ({
      execSync: vi.fn(),
      exec: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('should skip React Router codegen when react-router is not available', async () => {
    const cp = await import('child_process');
    execSyncMock = vi.mocked(cp.execSync);

    const {renderInfo} = await import('@shopify/cli-kit/node/ui');
    const renderInfoSpy = vi.mocked(renderInfo);

    // Mock react-router --version to fail (not installed)
    execSyncMock.mockImplementation(() => {
      throw new Error('Command not found: react-router');
    });

    // The function should not throw
    await expect(
      executeReactRouterCodegen({rootDirectory: '/test/path'}),
    ).resolves.toBeUndefined();

    // Verify react-router --version was attempted
    expect(execSyncMock).toHaveBeenCalledWith('npx react-router --version', {
      cwd: '/test/path',
      stdio: 'ignore',
    });

    // Verify renderInfo was called with the skip message
    expect(renderInfoSpy).toHaveBeenCalledWith({
      body: 'React Router not found, skipping typegen',
    });

    // Verify typegen was NOT called
    expect(execSyncMock).toHaveBeenCalledTimes(1); // Only the version check
  });

  it('should run React Router codegen when react-router is available (non-watch mode)', async () => {
    const cp = await import('child_process');
    execSyncMock = vi.mocked(cp.execSync);
    execMock = vi.mocked(cp.exec);

    // Mock react-router --version to succeed
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('react-router --version')) {
        return Buffer.from('7.0.0');
      }
      if (cmd.includes('react-router typegen')) {
        return Buffer.from('Types generated successfully');
      }
      throw new Error(`Unexpected command: ${cmd}`);
    });

    await executeReactRouterCodegen({rootDirectory: '/test/path'});

    // Verify both commands were called
    expect(execSyncMock).toHaveBeenCalledWith('npx react-router --version', {
      cwd: '/test/path',
      stdio: 'ignore',
    });

    expect(execSyncMock).toHaveBeenCalledWith('npx react-router typegen', {
      cwd: '/test/path',
      stdio: 'inherit',
    });

    // exec should not be called in non-watch mode
    expect(execMock).not.toHaveBeenCalled();
  });

  it('should run React Router codegen in watch mode when react-router is available', async () => {
    const cp = await import('child_process');
    execSyncMock = vi.mocked(cp.execSync);
    execMock = vi.mocked(cp.exec);

    // Mock react-router --version to succeed
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.includes('react-router --version')) {
        return Buffer.from('7.0.0');
      }
      throw new Error(`Unexpected command: ${cmd}`);
    });

    await executeReactRouterCodegen({
      rootDirectory: '/test/path',
      watch: true,
    });

    // Verify version check was called
    expect(execSyncMock).toHaveBeenCalledWith('npx react-router --version', {
      cwd: '/test/path',
      stdio: 'ignore',
    });

    // In watch mode, should use exec instead of execSync
    expect(execMock).toHaveBeenCalledWith('npx react-router typegen --watch', {
      cwd: '/test/path',
    });

    // execSync should NOT be called for typegen in watch mode
    expect(execSyncMock).toHaveBeenCalledTimes(1); // Only version check
  });
});
