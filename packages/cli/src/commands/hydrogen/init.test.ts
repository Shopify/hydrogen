import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {runInit} from './init.js';
import {ui, output} from '@shopify/cli-kit';
import {installNodeModules} from '@shopify/cli-kit/node/node-package-manager';
import {renderInfo} from '@shopify/cli-kit/node/ui';

describe('init', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('@shopify/cli-kit');
    vi.mock('../../utils/transpile-ts.js');
    vi.mock('../../utils/template-downloader.js', async () => ({
      getLatestTemplates: () => Promise.resolve({}),
    }));
    vi.mock('@shopify/cli-kit/node/node-package-manager');
    vi.mocked(ui.prompt).mockImplementation(() =>
      Promise.resolve({installDeps: 'false'}),
    );
    vi.mocked(output.content).mockImplementation(() => ({
      value: '',
    }));
    vi.mock('@shopify/cli-kit/node/ui');
  });

  const defaultOptions = (stubs: Record<any, unknown>) => ({
    template: 'hello-world',
    language: 'js',
    path: 'path/to/project',
    ...stubs,
  });

  describe.each([
    {flag: 'template', value: 'hello-world'},
    {flag: 'installDeps', value: true},
    {flag: 'language', value: 'ts'},
    {flag: 'path', value: './my-app'},
  ])('flag $flag', ({flag, value}) => {
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
        expect(ui.prompt).not.toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: flag,
            }),
          ]),
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
        expect(ui.prompt).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: flag,
            }),
          ]),
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
