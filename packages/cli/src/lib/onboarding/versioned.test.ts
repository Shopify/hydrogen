import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import {setupVersionedTemplate} from './versioned.js';
import {findCommitForHydrogenVersion} from '../version-finder.js';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {AbortError} from '@shopify/cli-kit/node/error';
import {fetch} from '@shopify/cli-kit/node/http';
import {fileExists, writeFile} from '@shopify/cli-kit/node/fs';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {renderTasks, renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {mkdtemp, readFile} from 'node:fs/promises';
import type {PromiseWithChild} from 'node:child_process';
import * as common from './common.js';
import type {AdminSession} from '../auth.js';
import {execAsync} from '../process.js';

vi.mock('../version-finder.js');
vi.mock('@shopify/cli-kit/node/http');
vi.mock('@shopify/cli-kit/node/fs');
vi.mock('@shopify/cli-kit/node/output');
vi.mock('@shopify/cli-kit/node/ui');
vi.mock('../process.js');
const {rmdir, copyFile} = vi.mocked(await import('@shopify/cli-kit/node/fs'));
vi.mock('node:fs/promises');
// Helper to create a properly typed mock stream response
const createMockStreamResponse = (ok = true, status = 200) => {
  return {
    ok,
    status,
    body: {
      pipe: vi.fn().mockReturnThis(),
      on: vi.fn(),
    } as unknown as ReadableStream,
  } as any;
};

vi.mock('./common.js', () => ({
  handleProjectLocation: vi.fn(),
  createAbortHandler: vi.fn(),
  handleLanguage: vi.fn(),
  handleCssStrategy: vi.fn(),
  handleI18n: vi.fn(),
  handleRouteGeneration: vi.fn(),
  handleDependencies: vi.fn(),
  handleCliShortcut: vi.fn(),
  createInitialCommit: vi.fn(),
  commitAll: vi.fn(),
  renderProjectReady: vi.fn(),
  handleStorefrontLink: vi.fn(),
}));

const {
  handleProjectLocation,
  createAbortHandler,
  handleLanguage,
  handleCssStrategy,
  handleI18n,
  handleRouteGeneration,
  handleDependencies,
  handleCliShortcut,
  createInitialCommit,
  commitAll,
  renderProjectReady,
  handleStorefrontLink,
} = vi.mocked(common);
vi.mock('../shopify-config.js', () => ({
  setStorefront: vi.fn(),
  setUserAccount: vi.fn(),
}));
vi.mock('../shell.js', () => ({
  getCliCommand: vi.fn().mockResolvedValue('npm run'),
}));

// Mock tar-fs and gunzip-maybe
vi.mock('tar-fs', () => ({
  extract: vi.fn().mockReturnValue({
    on: vi.fn(),
  }),
}));
vi.mock('gunzip-maybe', () => ({
  default: vi.fn().mockReturnValue({
    on: vi.fn(),
  }),
}));

// Mock pipeline from stream/promises
vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

describe('versioned', () => {
  const mockController = new AbortController();
  const mockProject = {
    name: 'test-project',
    directory: '/tmp/test-project',
    location: '/tmp/test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock execAsync to return valid but empty lockfile - pinDependenciesToLockfile will handle gracefully
    vi.mocked(execAsync).mockImplementation((cmd, options?) => {
      return Promise.resolve({
        stdout: JSON.stringify({
          packages: {},
        }),
        stderr: '',
      }) as PromiseWithChild<{stdout: string; stderr: string}>;
    });

    // Mock readFile to return valid package.json
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        name: 'test-project',
        dependencies: {},
        devDependencies: {},
      }),
    );

    handleProjectLocation.mockResolvedValue(mockProject);
    createAbortHandler.mockReturnValue(async (error: any) => {
      throw error;
    });
    handleLanguage.mockResolvedValue({
      language: 'ts',
      transpileProject: vi.fn().mockResolvedValue(undefined),
    });
    handleCssStrategy.mockResolvedValue({
      cssStrategy: 'tailwind',
      setupCss: vi.fn().mockResolvedValue(undefined),
    });
    handleI18n.mockResolvedValue({
      i18nStrategy: undefined,
      setupI18n: vi.fn().mockResolvedValue(undefined),
    });
    handleRouteGeneration.mockResolvedValue({
      needsRouteGeneration: false,
      setupRoutes: vi.fn().mockResolvedValue(undefined),
    });
    handleDependencies.mockResolvedValue({
      packageManager: 'npm',
      shouldInstallDeps: false,
      installDeps: vi.fn(),
    });
    handleCliShortcut.mockResolvedValue({});
    vi.mocked(mkdtemp).mockResolvedValue('/tmp/hydrogen-temp');
    vi.mocked(fileExists).mockResolvedValue(true);
    vi.mocked(rmdir).mockResolvedValue(undefined);
    vi.mocked(copyFile).mockResolvedValue(undefined);
    vi.mocked(renderSelectPrompt).mockResolvedValue('mock');
    // Mock renderTasks to execute tasks by default, handling errors gracefully
    // The real renderTasks wraps everything in React components and useAsyncAndUnmount
    // which ensures no unhandled promise rejections
    vi.mocked(renderTasks).mockImplementation(async (tasks, options?) => {
      const ctx = {};

      // Wrap in a Promise like the real implementation does
      return new Promise(async (resolve, reject) => {
        try {
          for (const task of tasks) {
            if (task.skip?.(ctx)) {
              continue;
            }
            // Execute task - the real implementation catches errors here
            const result = await task.task(ctx, task);
            // Handle subtasks if returned
            if (Array.isArray(result) && result.length > 0) {
              for (const subTask of result) {
                await subTask.task(ctx, subTask);
              }
            }
          }
          resolve(ctx);
        } catch (error) {
          // Real implementation sets state to Failure here
          reject(error);
        }
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('setupVersionedTemplate', () => {
    it('should validate version format', async () => {
      const options = {
        version: 'invalid-format',
      };

      await expect(
        setupVersionedTemplate(options, mockController),
      ).rejects.toThrow(AbortError);
      await expect(
        setupVersionedTemplate(options, mockController),
      ).rejects.toThrow('Invalid version format');
    });

    it('should throw error if version is not found in git history', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue(undefined);

      const options = {
        version: '2040.10.9', // Valid format (month 10) but doesn't exist
      };

      await expect(
        setupVersionedTemplate(options, mockController),
      ).rejects.toThrow('Version 2040.10.9 not found.');
    });

    it('should use mock shop when mockShop option is true', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      expect(renderSelectPrompt).not.toHaveBeenCalled();
      expect(handleStorefrontLink).not.toHaveBeenCalled();
    });

    it('should prompt for storefront link when mockShop is false', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(renderSelectPrompt).mockResolvedValue('link');
      handleStorefrontLink.mockResolvedValue({
        id: 'storefront-123',
        title: 'My Store',
        shop: 'test.myshopify.com',
        shopName: 'Test Shop',
        email: 'test@example.com',
        session: {} as AdminSession,
      });
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: false,
      };

      await setupVersionedTemplate(options, mockController);

      expect(renderSelectPrompt).toHaveBeenCalledWith({
        message: 'Connect to Shopify',
        choices: expect.any(Array),
        defaultValue: 'mock',
        abortSignal: mockController.signal,
      });
      expect(handleStorefrontLink).toHaveBeenCalled();
    });

    it('should try tag-based URL first, then fall back to commit-based', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');

      // First call returns 404 (tag not found), second call succeeds, third call for package-lock.json
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          body: {
            pipe: vi.fn().mockReturnThis(),
            on: vi.fn(),
          },
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any);

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/repos/Shopify/hydrogen/tarball/skeleton@2025.1.1',
        expect.any(Object),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://github.com/Shopify/hydrogen/archive/commit123.tar.gz',
        expect.any(Object),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        3,
        'https://raw.githubusercontent.com/Shopify/hydrogen/commit123/package-lock.json',
        expect.any(Object),
      );
    });

    it('should create .env file with SESSION_SECRET for mock shop', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        expect.stringContaining('SESSION_SECRET="foobar"'),
      );
    });

    it('should handle git initialization when git option is true', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: true,
        git: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      expect(createInitialCommit).toHaveBeenCalledWith(mockProject.directory);
    });

    it('should display version-specific success message', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      expect(outputInfo).toHaveBeenCalledWith(
        expect.stringContaining('Project created from Hydrogen 2025.1.1'),
      );
    });

    // Error scenarios are tested in versioned.integration.test.ts to avoid mocking complexity

    it('should clean up temp directory on success', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      expect(vi.mocked(rmdir)).toHaveBeenCalledWith(
        '/tmp/hydrogen-temp',
        expect.any(Object),
      );
    });

    it('should handle version validation with edge cases', async () => {
      const invalidVersions = [
        '2025.2.1', // Invalid month (February)
        '2025.3.1', // Invalid month (March)
        '2025.5.1', // Invalid month (May)
        '2025.6.1', // Invalid month (June)
        '2025.8.1', // Invalid month (August)
        '2025.9.1', // Invalid month (September)
        '2025.11.1', // Invalid month (November)
        '2025.12.1', // Invalid month (December)
        '2025.13.1', // Invalid month (> 12)
        '2025.0.1', // Invalid month (0)
        '2025.1', // Missing patch
        '2025', // Missing minor and patch
        'v2025.1.1', // Has prefix
        '2025.01.1', // Leading zero in month
        '2025.1.01', // Leading zero in patch
      ];

      for (const version of invalidVersions) {
        const options = {version};
        await expect(
          setupVersionedTemplate(options, mockController),
        ).rejects.toThrow('Invalid version format');
      }
    });

    it('should accept valid version formats', async () => {
      const validVersions = [
        '2025.1.0',
        '2025.4.0',
        '2025.7.0',
        '2025.10.0',
        '2025.1.1',
        '2025.1.999',
        '2024.10.123',
      ];

      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      for (const version of validVersions) {
        const options = {
          version,
          mockShop: true,
          quickstart: true,
        };
        await expect(
          setupVersionedTemplate(options, mockController),
        ).resolves.not.toThrow();
      }
    });

    it('should handle dependency installation failures gracefully', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const mockInstallDeps = vi
        .fn()
        .mockRejectedValueOnce(new Error('npm install failed'));
      handleDependencies.mockResolvedValueOnce({
        packageManager: 'npm',
        shouldInstallDeps: true,
        installDeps: mockInstallDeps,
      });

      const options = {
        version: '2025.1.1',
        mockShop: true,
        installDeps: true,
        quickstart: true,
      };

      const result = await setupVersionedTemplate(options, mockController);

      // Should complete but with depsError
      expect(result).toMatchObject({
        depsInstalled: false,
        depsError: expect.objectContaining({
          message: 'npm install failed',
        }),
      });
    });

    it('should handle abort signal during setup', async () => {
      const abortController = new AbortController();
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');

      // Abort immediately
      abortController.abort();

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      handleProjectLocation.mockRejectedValueOnce(
        new AbortError('Operation aborted'),
      );

      await expect(
        setupVersionedTemplate(options, abortController),
      ).rejects.toThrow(AbortError);
    });

    it('should handle storefront setup failure', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(renderSelectPrompt).mockResolvedValue('link');
      handleStorefrontLink.mockRejectedValueOnce(
        new Error('Failed to link storefront'),
      );
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options = {
        version: '2025.1.1',
        mockShop: false,
      };

      await expect(
        setupVersionedTemplate(options, mockController),
      ).rejects.toThrow('Failed to link storefront');
    });

    it('should handle CSS setup with custom strategy', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      handleCssStrategy.mockResolvedValueOnce({
        cssStrategy: 'postcss',
        setupCss: vi.fn().mockResolvedValue(undefined),
      });

      const options = {
        version: '2025.1.1',
        mockShop: true,
        styling: 'postcss' as const,
        quickstart: true,
      };

      const result = await setupVersionedTemplate(options, mockController);

      // Should return with the specified CSS strategy
      expect(result?.cssStrategy).toBe('postcss');
      expect(handleCssStrategy).toHaveBeenCalledWith(
        mockProject.directory,
        mockController,
        'postcss',
      );
    });

    it('should handle i18n setup with different strategies', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      handleI18n.mockResolvedValueOnce({
        i18nStrategy: 'subfolders',
        setupI18n: vi.fn().mockResolvedValue(undefined),
      });

      const options = {
        version: '2025.1.1',
        mockShop: true,
        i18n: 'subfolders' as const,
        quickstart: true,
      };

      const result = await setupVersionedTemplate(options, mockController);

      // Should return with the specified i18n strategy
      expect(result?.i18n).toBe('subfolders');
      expect(handleI18n).toHaveBeenCalledWith(
        mockController,
        undefined, // cliCommand is computed but undefined in this test context
        'subfolders',
      );
    });

    it('should handle route generation when setupRoutes is invoked', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const mockSetupRoutes = vi.fn().mockResolvedValue(undefined);
      handleRouteGeneration.mockResolvedValueOnce({
        needsRouteGeneration: true,
        setupRoutes: mockSetupRoutes,
      });

      const options = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      const result = await setupVersionedTemplate(options, mockController);

      // Should invoke setupRoutes and complete successfully
      expect(mockSetupRoutes).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle JavaScript language option', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      handleLanguage.mockResolvedValueOnce({
        language: 'js',
        transpileProject: vi.fn().mockResolvedValue(undefined),
      });

      const options = {
        version: '2025.1.1',
        mockShop: true,
        language: 'js' as const,
        quickstart: true,
      };

      const result = await setupVersionedTemplate(options, mockController);

      // Should return with JS as the language
      expect(result?.language).toBe('js');
      expect(handleLanguage).toHaveBeenCalledWith(
        mockProject.directory,
        mockController,
        'js',
      );
    });

    it('should handle concurrent setup operations correctly', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');
      vi.mocked(fetch).mockResolvedValue(createMockStreamResponse(true, 200));

      const options1 = {
        version: '2025.1.1',
        mockShop: true,
        quickstart: true,
      };

      const options2 = {
        version: '2025.4.2',
        mockShop: true,
        quickstart: true,
      };

      // Run two setups concurrently
      const [result1, result2] = await Promise.all([
        setupVersionedTemplate(options1, mockController),
        setupVersionedTemplate(options2, mockController),
      ]);

      // Both should succeed
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Should have created two temp directories
      expect(vi.mocked(mkdtemp)).toHaveBeenCalledTimes(2);

      // Should have cleaned up both temp directories
      expect(vi.mocked(rmdir)).toHaveBeenCalledTimes(2);
    });

    it('should pin dependencies from package-lock.json when available', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');

      // Mock successful skeleton download
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          body: {
            pipe: vi.fn().mockReturnThis(),
            on: vi.fn(),
          },
        } as any)
        // Mock successful package-lock.json fetch with dependencies
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(
            JSON.stringify({
              packages: {
                'templates/skeleton': {
                  dependencies: {
                    '@shopify/hydrogen': '2025.1.0',
                    react: '^18.2.0',
                  },
                },
                'packages/hydrogen': {
                  version: '2025.1.0',
                },
                'node_modules/react': {
                  version: '18.2.0',
                },
              },
            }),
          ),
        } as any);

      // Mock readFile for package.json
      vi.mocked(readFile).mockResolvedValueOnce(
        JSON.stringify({
          dependencies: {
            '@shopify/hydrogen': '2025.1.0',
            react: '^18.2.0',
          },
        }),
      );

      const options = {
        version: '2025.1.0',
        mockShop: true,
        quickstart: true,
      };

      await setupVersionedTemplate(options, mockController);

      // Verify writeFile was called to update package.json with pinned versions
      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const packageJsonWrite = writeFileCalls.find((call) =>
        call[0].endsWith('package.json'),
      );

      expect(packageJsonWrite).toBeDefined();
      if (packageJsonWrite) {
        const packageContent = JSON.parse(packageJsonWrite[1] as string);
        expect(packageContent.dependencies).toEqual({
          '@shopify/hydrogen': '2025.1.0',
          react: '18.2.0', // Should be pinned without ^
        });
      }
    });

    it('should gracefully handle missing package-lock.json', async () => {
      vi.mocked(findCommitForHydrogenVersion).mockResolvedValue('commit123');

      // Mock successful skeleton download
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          body: {
            pipe: vi.fn().mockReturnThis(),
            on: vi.fn(),
          },
        } as any)
        // Mock 404 for package-lock.json
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any);

      const options = {
        version: '2025.1.0',
        mockShop: true,
        quickstart: true,
      };

      // Should not throw and complete successfully
      const result = await setupVersionedTemplate(options, mockController);

      expect(result).toBeDefined();
      expect(result?.version).toBe('2025.1.0');
    });
  });
});
