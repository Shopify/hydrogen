import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {runInit} from './init.js';
import {ui} from '@shopify/cli-kit';
import {installNodeModules} from '@shopify/cli-kit/node/node-package-manager';

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
  });

  const defaultOptions = (stubs: Record<any, unknown>) => ({
    template: 'hello-world',
    language: 'js',
    path: 'path/to/project',
    ...stubs,
  });

  describe('installDeps', () => {
    it('prompts the user to install dependencies when installDeps is not passed', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        // Given
        const options = defaultOptions({path: tmpDir});

        vi.mocked(ui.prompt).mockImplementation(() =>
          Promise.resolve({installDeps: 'false'}),
        );

        // When
        await runInit(options);

        // Then
        expect(ui.prompt).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'installDeps',
            }),
          ]),
        );
        expect(installNodeModules).not.toHaveBeenCalled();
      });
    });

    it('does not prompt the user to install dependencies when installDeps is true', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        // Given
        const options = defaultOptions({installDeps: true, path: tmpDir});

        // When
        await runInit(options);

        // Then
        expect(ui.prompt).not.toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'installDeps',
            }),
          ]),
        );
        expect(installNodeModules).toHaveBeenCalled();
      });
    });

    it('does not show a prompt to install dependencies when installDeps is false', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        // Given
        const options = defaultOptions({installDeps: false, path: tmpDir});

        // When
        await runInit(options);

        // Then
        expect(ui.prompt).not.toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'installDeps',
            }),
          ]),
        );
        expect(installNodeModules).not.toHaveBeenCalled();
      });
    });
  });
});
