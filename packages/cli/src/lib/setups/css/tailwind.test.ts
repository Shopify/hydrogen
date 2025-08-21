import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {setupTailwind} from './tailwind.js';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {mergePackageJson} from '../../file.js';
import {copyAssets} from './assets.js';
import {replaceRootLinks, injectVitePlugin} from './replacers.js';
import {fileExists, writeFile, mkdirSync} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';

vi.mock('@shopify/cli-kit/node/output');
vi.mock('@shopify/cli-kit/node/fs');
vi.mock('../../file.js');
vi.mock('./assets.js');
vi.mock('./replacers.js');
vi.mock('../../format-code.js', () => ({
  getCodeFormatOptions: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../build.js', () => ({
  getAssetsDir: vi.fn().mockResolvedValue('/mock/assets/tailwind'),
}));

describe('setupTailwind', () => {
  const rootDirectory = '/test-project';
  const appDirectory = '/test-project/app';
  const config = {rootDirectory, appDirectory};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileExists).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets up Tailwind CSS v4 with correct configuration', async () => {
    vi.mocked(mergePackageJson).mockResolvedValue([] as any);
    vi.mocked(copyAssets).mockResolvedValue([] as any);
    vi.mocked(replaceRootLinks).mockResolvedValue(undefined);
    vi.mocked(injectVitePlugin).mockResolvedValue(undefined);

    const result = await setupTailwind(config);

    expect(result).toBeDefined();
    expect(result?.generatedAssets).toEqual(['app/styles/tailwind.css']);
    expect(result?.needsInstallDeps).toBe(true);

    expect(mergePackageJson).toHaveBeenCalledWith(
      '/mock/assets/tailwind',
      rootDirectory,
    );

    expect(copyAssets).toHaveBeenCalledWith(
      'tailwind',
      {'tailwind.css': 'app/styles/tailwind.css'},
      rootDirectory,
    );

    await result?.workPromise;

    expect(replaceRootLinks).toHaveBeenCalledWith(
      appDirectory,
      {},
      {
        name: 'tailwindCss',
        path: 'styles/tailwind.css?url',
        isDefault: true,
      },
    );

    expect(injectVitePlugin).toHaveBeenCalledWith(
      rootDirectory,
      {},
      {
        name: 'tailwindcss',
        path: '@tailwindcss/vite',
        isDefault: true,
      },
    );
  });

  it('uses CSS-first configuration approach', async () => {
    vi.mocked(copyAssets).mockImplementation(
      async (assetType, assetMap, rootDir) => {
        expect(assetType).toBe('tailwind');
        expect(assetMap).toHaveProperty('tailwind.css');
        return [] as any;
      },
    );

    await setupTailwind(config);

    expect(copyAssets).toHaveBeenCalled();
  });

  it('skips setup when files already exist without force flag', async () => {
    vi.mocked(fileExists).mockResolvedValue(true);

    const result = await setupTailwind(config, false);

    expect(result).toBeUndefined();
    expect(outputInfo).toHaveBeenCalledWith(
      expect.stringContaining('Skipping CSS setup'),
    );
    expect(mergePackageJson).not.toHaveBeenCalled();
  });

  it('overwrites existing files when force flag is true', async () => {
    vi.mocked(fileExists).mockResolvedValue(true);

    vi.mocked(mergePackageJson).mockResolvedValue([] as any);
    vi.mocked(copyAssets).mockResolvedValue([] as any);
    vi.mocked(replaceRootLinks).mockResolvedValue(undefined);
    vi.mocked(injectVitePlugin).mockResolvedValue(undefined);

    const result = await setupTailwind(config, true);

    expect(result).toBeDefined();
    expect(mergePackageJson).toHaveBeenCalled();
    expect(copyAssets).toHaveBeenCalled();
  });

  it('integrates with Vite using @tailwindcss/vite plugin', async () => {
    vi.mocked(injectVitePlugin).mockImplementation(
      async (rootDir, formatConfig, importer) => {
        expect(importer.path).toBe('@tailwindcss/vite');
        expect(importer.name).toBe('tailwindcss');
        expect(importer.isDefault).toBe(true);
      },
    );

    await setupTailwind(config);

    await expect(injectVitePlugin).toHaveBeenCalled();
  });

  it('adds tailwind.css with ?url import for production builds', async () => {
    vi.mocked(replaceRootLinks).mockImplementation(
      async (appDir, formatConfig, importer) => {
        expect(importer.path).toBe('styles/tailwind.css?url');
        expect(importer.name).toBe('tailwindCss');
        expect(importer.isDefault).toBe(true);
      },
    );

    await setupTailwind(config);

    await expect(replaceRootLinks).toHaveBeenCalled();
  });

  it('returns correct asset paths for generated files', async () => {
    vi.mocked(mergePackageJson).mockResolvedValue([] as any);
    vi.mocked(copyAssets).mockResolvedValue([] as any);
    vi.mocked(replaceRootLinks).mockResolvedValue(undefined);
    vi.mocked(injectVitePlugin).mockResolvedValue(undefined);

    const result = await setupTailwind(config);

    expect(result?.generatedAssets).toContain('app/styles/tailwind.css');
    expect(result?.generatedAssets).toHaveLength(1);
  });

  it('correctly calculates relative paths for nested app directories', async () => {
    const nestedConfig = {
      rootDirectory: '/test-project',
      appDirectory: '/test-project/src/app',
    };

    vi.mocked(mergePackageJson).mockResolvedValue([] as any);
    vi.mocked(copyAssets).mockResolvedValue([] as any);
    vi.mocked(replaceRootLinks).mockResolvedValue(undefined);
    vi.mocked(injectVitePlugin).mockResolvedValue(undefined);

    const result = await setupTailwind(nestedConfig);

    expect(result?.generatedAssets).toEqual(['src/app/styles/tailwind.css']);

    expect(copyAssets).toHaveBeenCalledWith(
      'tailwind',
      {'tailwind.css': 'src/app/styles/tailwind.css'},
      '/test-project',
    );
  });

  it('handles errors gracefully when Vite config is missing', async () => {
    vi.mocked(mergePackageJson).mockResolvedValue([] as any);
    vi.mocked(copyAssets).mockResolvedValue([] as any);
    vi.mocked(replaceRootLinks).mockResolvedValue(undefined);
    vi.mocked(injectVitePlugin).mockRejectedValue(
      new Error('Could not find vite.config file'),
    );

    const result = await setupTailwind(config);

    await expect(result?.workPromise).rejects.toThrow(
      'Could not find vite.config file',
    );
  });

  it('handles errors gracefully when root file is missing', async () => {
    vi.mocked(mergePackageJson).mockResolvedValue([] as any);
    vi.mocked(copyAssets).mockResolvedValue([] as any);
    vi.mocked(replaceRootLinks).mockRejectedValue(
      new Error('Could not find root file'),
    );
    vi.mocked(injectVitePlugin).mockResolvedValue(undefined);

    const result = await setupTailwind(config);

    await expect(result?.workPromise).rejects.toThrow(
      'Could not find root file',
    );
  });
});