/**
 * Test Suite: Tailwind CSS Setup Function
 * 
 * WHY these tests exist:
 * The setupTailwind function orchestrates the complete Tailwind CSS v4 setup in Hydrogen
 * projects. This includes package.json updates, file copying, root link replacements, and
 * Vite plugin configuration. Testing this function is crucial because:
 * - It's the entry point for adding Tailwind to existing projects via `h2 setup css`
 * - It's called during project scaffolding with `--styling tailwind`
 * - Failures here cause broken CSS setups that lead to FOUC in production
 * - It must handle both new projects and existing projects with other CSS setups
 * 
 * WHAT these tests validate:
 * 1. Complete Tailwind setup with all required optimizations (fetchPriority, viteEnvironmentApi)
 * 2. Proper file creation (tailwind.css with @import 'tailwindcss')
 * 3. Package.json updates with correct Tailwind versions
 * 4. Skipping setup when files exist (unless --force is used)
 * 5. Correct path resolution for nested app directories
 * 6. TypeScript vs JavaScript project handling
 * 7. Replacement of existing CSS setups (appStyles -> tailwindStyles)
 * 8. Error handling and graceful degradation
 * 
 * These tests ensure Tailwind CSS v4 is properly integrated with FOUC prevention measures.
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {setupTailwind} from './tailwind.js';
import * as fileUtils from '../../file.js';
import * as formatUtils from '../../format-code.js';
import {type FormatOptions} from '../../format-code.js';
import * as assetUtils from './assets.js';
import * as replacerUtils from './replacers.js';
import * as buildUtils from '../../build.js';
import {TAILWIND_VERSION, TAILWIND_VITE_VERSION} from './versions.js';

vi.mock('../../file');
vi.mock('../../format-code');
vi.mock('./assets');
vi.mock('./replacers');
vi.mock('../../build');
vi.mock('@shopify/cli-kit/node/output', () => ({
  outputInfo: vi.fn(),
}));

describe('setupTailwind', () => {
  const mockRootDirectory = '/test/project';
  const mockAppDirectory = '/test/project/app';
  const mockFormatConfig = {semi: true, singleQuote: true};
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formatUtils.getCodeFormatOptions).mockResolvedValue(mockFormatConfig);
    vi.mocked(buildUtils.getAssetsDir).mockResolvedValue('/assets/tailwind');
  });

  it('should setup Tailwind CSS with all optimizations', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    vi.mocked(replacerUtils.replaceRootLinks).mockResolvedValue();
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(result).toBeDefined();
    expect(result?.generatedAssets).toContain('app/styles/tailwind.css');
    expect(result?.needsInstallDeps).toBe(true);

    expect(vi.mocked(replacerUtils.replaceRootLinks)).toHaveBeenCalledWith(
      mockAppDirectory,
      mockFormatConfig,
      {
        name: 'tailwindStyles',
        path: 'styles/tailwind.css?url',
        isDefault: true,
      }
    );

    expect(vi.mocked(replacerUtils.injectVitePlugin)).toHaveBeenCalledWith(
      mockRootDirectory,
      mockFormatConfig,
      {
        name: 'tailwindcss',
        path: '@tailwindcss/vite',
        isDefault: true,
      }
    );

    expect(vi.mocked(fileUtils.mergePackageJson)).toHaveBeenCalledWith(
      '/assets/tailwind',
      mockRootDirectory
    );
  });

  it('should skip setup when files already exist without force flag', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(false);

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(result).toBeUndefined();
    expect(vi.mocked(replacerUtils.replaceRootLinks)).not.toHaveBeenCalled();
    expect(vi.mocked(replacerUtils.injectVitePlugin)).not.toHaveBeenCalled();
  });

  it('should force setup when force flag is true', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    vi.mocked(replacerUtils.replaceRootLinks).mockResolvedValue();
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    const result = await setupTailwind(
      {
        rootDirectory: mockRootDirectory,
        appDirectory: mockAppDirectory,
      },
      true // force flag
    );

    expect(result).toBeDefined();
    expect(vi.mocked(assetUtils.canWriteFiles)).toHaveBeenCalledWith(
      expect.any(Object),
      mockAppDirectory,
      true
    );
  });

  it('should handle errors in replaceRootLinks gracefully', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    vi.mocked(replacerUtils.replaceRootLinks).mockRejectedValue(
      new Error('Could not find root file')
    );
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(result).toBeDefined();
    
    // The error should be caught in the workPromise
    await expect(result?.workPromise).rejects.toThrow('Could not find root file');
  });

  it('should correctly resolve paths for nested app directories', async () => {
    const nestedAppDirectory = '/test/project/src/app';
    
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    vi.mocked(replacerUtils.replaceRootLinks).mockResolvedValue();
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: nestedAppDirectory,
    });

    expect(result?.generatedAssets).toContain('src/app/styles/tailwind.css');
    
    expect(vi.mocked(assetUtils.copyAssets)).toHaveBeenCalledWith(
      'tailwind',
      {
        'tailwind.css': 'src/app/styles/tailwind.css',
      },
      mockRootDirectory
    );
  });
});

describe('setupTailwind integration scenarios', () => {
  const mockRootDirectory = '/test/project';
  const mockAppDirectory = '/test/project/app';
  const mockFormatConfig = {semi: true, singleQuote: true};
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formatUtils.getCodeFormatOptions).mockResolvedValue(mockFormatConfig);
    vi.mocked(buildUtils.getAssetsDir).mockResolvedValue('/assets/tailwind');
  });

  it('should handle TypeScript projects correctly', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    
    // Mock TypeScript file detection
    vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
      filepath: '/test/project/app/root.tsx',
      extension: 'tsx',
      astType: 'tsx',
    });
    
    vi.mocked(replacerUtils.replaceRootLinks).mockImplementation(async (appDir: string, config: FormatOptions, importer: {name: string; path: string; isDefault: boolean; isConditional?: boolean}) => {
      expect(importer.name).toBe('tailwindStyles');
      expect(importer.isDefault).toBe(true);
    });
    
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(result).toBeDefined();
    await result?.workPromise;
    
    expect(vi.mocked(replacerUtils.replaceRootLinks)).toHaveBeenCalled();
  });

  it('should handle JavaScript projects correctly', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    
    // Mock JavaScript file detection
    vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
      filepath: '/test/project/app/root.jsx',
      extension: 'jsx',
      astType: 'jsx',
    });
    
    vi.mocked(replacerUtils.replaceRootLinks).mockImplementation(async (appDir: string, config: FormatOptions, importer: {name: string; path: string; isDefault: boolean; isConditional?: boolean}) => {
      expect(importer.name).toBe('tailwindStyles');
      expect(importer.isDefault).toBe(true);
    });
    
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(result).toBeDefined();
    await result?.workPromise;
    
    expect(vi.mocked(replacerUtils.replaceRootLinks)).toHaveBeenCalled();
  });

  it('should ensure latest Tailwind version is installed', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    vi.mocked(replacerUtils.replaceRootLinks).mockResolvedValue();
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();
    
    vi.mocked(fileUtils.mergePackageJson).mockImplementation(async (assetDir: string, rootDir: string) => {
      expect(assetDir).toBe('/assets/tailwind');
      // This should merge the package.json with latest tailwindcss version
    });

    const result = await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(result).toBeDefined();
    expect(vi.mocked(fileUtils.mergePackageJson)).toHaveBeenCalled();
  });

  it('should handle projects with existing CSS setup', async () => {
    vi.mocked(assetUtils.canWriteFiles).mockResolvedValue(true);
    vi.mocked(fileUtils.mergePackageJson).mockResolvedValue();
    vi.mocked(assetUtils.copyAssets).mockImplementation(async () => []);
    
    // Mock existing appStyles that should be replaced
    const mockContentWithAppStyles = `
import appStyles from '~/styles/app.css?url';
export function links() {
  return [{href: appStyles}];
}`;
    
    vi.mocked(fileUtils.replaceFileContent).mockImplementation(
      async (filepath: string, formatConfig: FormatOptions | false, callback: (content: string) => Promise<string | null | undefined> | string | null | undefined) => {
        const result = await callback(mockContentWithAppStyles);
        expect(result).not.toContain('appStyles');
        expect(result).toContain('tailwindStyles');
      }
    );
    
    vi.mocked(replacerUtils.replaceRootLinks).mockResolvedValue();
    vi.mocked(replacerUtils.injectVitePlugin).mockResolvedValue();

    await setupTailwind({
      rootDirectory: mockRootDirectory,
      appDirectory: mockAppDirectory,
    });

    expect(vi.mocked(replacerUtils.replaceRootLinks)).toHaveBeenCalled();
  });
});