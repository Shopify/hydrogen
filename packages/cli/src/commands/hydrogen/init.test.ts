import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {runInit} from './init.js';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
  renderTextPrompt,
  renderInfo,
} from '@shopify/cli-kit/node/ui';
import {outputContent} from '@shopify/cli-kit/node/output';
import {installNodeModules} from '@shopify/cli-kit/node/node-package-manager';

describe('init', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('@shopify/cli-kit/node/output');
    vi.mock('../../lib/transpile-ts.js');
    vi.mock('../../lib/setups/css/index.js');
    vi.mock('../../lib/template-downloader.js', async () => ({
      getLatestTemplates: () => Promise.resolve({}),
    }));
    vi.mock('@shopify/cli-kit/node/node-package-manager', async () => {
      const original = await vi.importActual<
        typeof import('@shopify/cli-kit/node/node-package-manager')
      >('@shopify/cli-kit/node/node-package-manager');

      return {
        ...original,
        installNodeModules: vi.fn(),
        getPackageManager: () => Promise.resolve('npm'),
      };
    });
    vi.mocked(outputContent).mockImplementation(() => ({
      value: '',
    }));
    vi.mock('@shopify/cli-kit/node/ui', async () => {
      const original = await vi.importActual<
        typeof import('@shopify/cli-kit/node/ui')
      >('@shopify/cli-kit/node/ui');

      return {
        ...original,
        renderConfirmationPrompt: vi.fn(),
        renderSelectPrompt: vi.fn(),
        renderTextPrompt: vi.fn(),
        renderInfo: vi.fn(),
      };
    });
    vi.mock('@shopify/cli-kit/node/fs', async () => ({
      fileExists: () => Promise.resolve(true),
      isDirectory: () => Promise.resolve(false),
      copyFile: () => Promise.resolve(),
      rmdir: () => Promise.resolve(),
    }));
  });

  const defaultOptions = (stubs: Record<any, unknown>) => ({
    language: 'js' as const,
    path: 'path/to/project',
    ...stubs,
  });

  describe.each([
    {
      flag: 'installDeps',
      value: true,
      condition: {fn: renderConfirmationPrompt, match: /install dependencies/i},
    },
    {
      flag: 'language',
      value: 'ts',
      condition: {fn: renderSelectPrompt, match: /language/i},
    },
    {
      flag: 'path',
      value: './my-app',
      condition: {fn: renderTextPrompt, match: /where/i},
    },
  ])('flag $flag', ({flag, value, condition}) => {
    it.skip(`does not prompt the user for ${flag} when a value is passed in options`, async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        // Given
        const options = defaultOptions({
          path: tmpDir,
          [flag as string]: value,
        });

        // When
        await runInit(options);

        // Then
        expect(condition.fn).not.toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(condition.match),
          }),
        );
      });
    });

    it.skip(`prompts the user for ${flag} when no value is passed in options`, async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        // Given
        const options = defaultOptions({
          path: tmpDir,
          [flag as string]: undefined,
        });

        // When
        await runInit(options);

        // Then
        expect(condition.fn).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(condition.match),
          }),
        );
      });
    });
  });

  it.skip('installs dependencies when installDeps is true', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({installDeps: true, path: tmpDir});

      // When
      await runInit(options);

      // Then
      expect(installNodeModules).toHaveBeenCalled();
    });
  });

  it.skip('does not install dependencies when installDeps is false', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({installDeps: false, path: tmpDir});

      // When
      await runInit(options);

      // Then
      expect(installNodeModules).not.toHaveBeenCalled();
    });
  });

  it.skip('displays inventory information when using the demo-store template', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({
        installDeps: false,
        path: tmpDir,
        template: 'demo-store',
      });

      // When
      await runInit(options);

      // Then
      expect(renderInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: expect.stringContaining('Hydrogen Demo Store'),
        }),
      );
    });
  });

  it.skip('does not display inventory information when using non-demo-store templates', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({
        installDeps: false,
        path: tmpDir,
        // Not demo-store
      });

      // When
      await runInit(options);

      // Then
      expect(renderInfo).not.toHaveBeenCalledWith(
        expect.objectContaining({
          headline: expect.stringContaining('Hydrogen Demo Store'),
        }),
      );
    });
  });
});
