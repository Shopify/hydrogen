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
    vi.mock('../../lib/template-downloader.js', async () => ({
      getLatestTemplates: () => Promise.resolve({}),
    }));
    vi.mock('@shopify/cli-kit/node/node-package-manager');
    vi.mocked(outputContent).mockImplementation(() => ({
      value: '',
    }));
    vi.mock('@shopify/cli-kit/node/ui');
    vi.mock('@shopify/cli-kit/node/fs');
  });

  const defaultOptions = (stubs: Record<any, unknown>) => ({
    template: 'hello-world',
    language: 'js',
    path: 'path/to/project',
    ...stubs,
  });

  describe.each([
    {
      flag: 'template',
      value: 'hello-world',
      condition: {fn: renderSelectPrompt, match: /template/i},
    },
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
    it(`does not prompt the user for ${flag} when a value is passed in options`, async () => {
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

    it(`prompts the user for ${flag} when no value is passed in options`, async () => {
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

  it('installs dependencies when installDeps is true', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({installDeps: true, path: tmpDir});

      // When
      await runInit(options);

      // Then
      expect(installNodeModules).toHaveBeenCalled();
    });
  });

  it('does not install dependencies when installDeps is false', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({installDeps: false, path: tmpDir});

      // When
      await runInit(options);

      // Then
      expect(installNodeModules).not.toHaveBeenCalled();
    });
  });

  it('displays inventory information when using the demo-store template', async () => {
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
      expect(renderInfo).toHaveBeenCalledTimes(1);
      expect(renderInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining(
            'To connect this project to your Shopify store’s inventory',
          ),
          headline: expect.stringContaining(
            'Your project will display inventory from the Hydrogen Demo Store',
          ),
        }),
      );
    });
  });

  it('does not display inventory information when using non-demo-store templates', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      // Given
      const options = defaultOptions({
        installDeps: false,
        path: tmpDir,
        // Not demo-store
        template: 'pizza-store',
      });

      // When
      await runInit(options);

      // Then
      expect(renderInfo).toHaveBeenCalledTimes(0);
    });
  });
});
