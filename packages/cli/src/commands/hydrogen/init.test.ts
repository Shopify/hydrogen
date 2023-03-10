import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {runInit} from './init.js';
import {ui, path} from '@shopify/cli-kit';
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
});
