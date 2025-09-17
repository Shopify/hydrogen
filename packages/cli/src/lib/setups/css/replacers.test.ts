/**
 * Test Suite: CSS Replacers Functions
 * 
 * WHY these tests exist:
 * The replaceRootLinks and injectVitePlugin functions are critical for properly setting up
 * CSS frameworks (especially Tailwind CSS v4) in Hydrogen projects. These functions modify
 * the root.tsx/jsx file to add CSS imports and update link tags. Without proper testing,
 * we've seen bugs where:
 * - CSS imports are duplicated or missing
 * - appStyles isn't properly replaced with tailwindStyles
 * - JavaScript files are handled differently than TypeScript files
 * - The viteEnvironmentApi flag isn't set, causing FOUC in production
 * 
 * WHAT these tests validate:
 * 1. Correct replacement of appStyles with tailwindStyles in both imports and usage
 * 2. Proper handling of both TypeScript (.tsx) and JavaScript (.jsx) files
 * 3. Prevention of duplicate imports when running setup multiple times
 * 4. Conditional CSS imports for dynamic loading scenarios
 * 5. Error handling when root files or required exports are missing
 * 6. Vite plugin injection without duplication
 * 
 * These tests ensure the FOUC fixes work correctly across all project types.
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {replaceRootLinks, injectVitePlugin} from './replacers.js';
import * as fileUtils from '../../file.js';
import * as formatUtils from '../../format-code.js';

vi.mock('../../file');
vi.mock('../../format-code');
vi.mock('@shopify/cli-kit/node/fs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe('replaceRootLinks', () => {
  const mockFormatConfig = {semi: true, singleQuote: true};
  const mockRootDirectory = '/test/app';
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formatUtils.getCodeFormatOptions).mockResolvedValue(mockFormatConfig);
  });

  describe('TypeScript files', () => {
    const mockTsContent = `import {Analytics} from '@shopify/hydrogen';
import {Links, Meta} from 'react-router';
import favicon from '~/assets/favicon.svg';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';

export function links() {
  return [
    {
      rel: 'preload',
      as: 'style',
      href: resetStyles,
      fetchPriority: 'high',
    },
    {
      rel: 'preload',
      as: 'style',
      href: appStyles,
      fetchPriority: 'high',
    },
  ];
}

export function Layout({children}: {children?: React.ReactNode}) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
      </head>
    </html>
  );
}`;

    it('should replace appStyles with tailwindStyles and add import', async () => {
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        extension: 'tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(mockTsContent);
          expect(result).toContain('import tailwindStyles from');
          expect(result).toContain('href: tailwindStyles,');
          expect(result).toContain('<link rel="stylesheet" href={tailwindStyles}></link>');
          expect(result).not.toContain('href: appStyles,');
          expect(result).not.toContain('import appStyles from');
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: 'styles/tailwind.css?url',
        isDefault: true,
      });
    });

    it('should add new CSS import when no appStyles exists', async () => {
      const contentWithoutAppStyles = mockTsContent
        .replace(/import appStyles.*\n/, '')
        .replace(/href: appStyles,/g, 'href: resetStyles,')
        .replace(/<link.*appStyles.*\/link>/g, '');
      
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        extension: 'tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(contentWithoutAppStyles);
          expect(result).toContain('import tailwindStyles from');
          expect(result).toContain('<link rel="stylesheet" href={tailwindStyles}></link>');
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: 'styles/tailwind.css?url',
        isDefault: true,
      });
    });

    it('should handle conditional CSS imports', async () => {
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        extension: 'tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(mockTsContent);
          expect(result).toContain('import customStyles from');
          expect(result).toContain('{customStyles && <link rel="stylesheet" href={customStyles}></link>}');
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'customStyles',
        path: 'styles/custom.css?url',
        isDefault: true,
        isConditional: true,
      });
    });
  });

  describe('JavaScript files', () => {
    const mockJsContent = `import {Analytics} from '@shopify/hydrogen';
import {Links, Meta} from 'react-router';
import favicon from '~/assets/favicon.svg';
import resetStyles from '~/styles/reset.css?url';

export function links() {
  return [
    {
      rel: 'preload',
      as: 'style',
      href: resetStyles,
      fetchPriority: 'high',
    },
    {
      rel: 'preload',
      as: 'style',
      href: tailwindStyles,
      fetchPriority: 'high',
    },
  ];
}

export function Layout({children}) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={tailwindStyles}></link>
      </head>
    </html>
  );
}`;

    it('should add missing tailwindStyles import in JavaScript files', async () => {
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.jsx',
        extension: 'jsx',
        astType: 'jsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(mockJsContent);
          expect(result).toBeTruthy();
          expect(result!).toContain('import tailwindStyles from \'~/styles/tailwind.css?url\'');
          expect(result!.match(/import tailwindStyles/g)?.length).toBe(1);
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
    });

    it('should not duplicate imports if already exists', async () => {
      const contentWithImport = `import tailwindStyles from '~/styles/tailwind.css?url';\n${mockJsContent}`;
      
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.jsx',
        extension: 'jsx',
        astType: 'jsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(contentWithImport);
          if (result) {
            expect(result.match(/import tailwindStyles/g)?.length).toBe(1);
          }
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
    });
  });

  describe('Edge cases', () => {
    it('should throw error when root file is not found', async () => {
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: undefined,
        astType: undefined,
      });

      await expect(
        replaceRootLinks(mockRootDirectory, mockFormatConfig, {
          name: 'tailwindStyles',
          path: 'styles/tailwind.css?url',
          isDefault: true,
        })
      ).rejects.toThrow('Could not find root file');
    });

    it('should throw error when links export is not found', async () => {
      const contentWithoutLinks = `import {Analytics} from '@shopify/hydrogen';
export function App() {
  return <div>Hello</div>;
}`;
      
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        extension: 'tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          await expect(callback(contentWithoutLinks)).rejects.toThrow('links');
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: 'styles/tailwind.css?url',
        isDefault: true,
      });
    });

    it('should handle multiple style imports correctly', async () => {
      const contentWithMultipleStyles = `import {Analytics} from '@shopify/hydrogen';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import customStyles from '~/styles/custom.css?url';

export function links() {
  return [
    {href: resetStyles},
    {href: appStyles},
    {href: customStyles},
  ];
}

export function Layout({children}) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <link rel="stylesheet" href={customStyles}></link>
      </head>
    </html>
  );
}`;
      
      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        extension: 'tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(contentWithMultipleStyles);
          expect(result).toContain('import tailwindStyles from');
          expect(result).not.toContain('import appStyles from');
          expect(result).toContain('href: tailwindStyles,');
          expect(result).toContain('href: customStyles,');
          expect(result).toContain('href: resetStyles,');
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: 'styles/tailwind.css?url',
        isDefault: true,
      });
    });
  });
});

describe('injectVitePlugin', () => {
  const mockFormatConfig = {semi: true, singleQuote: true};
  const mockRootDirectory = '/test';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should inject Tailwind Vite plugin', async () => {
    const mockViteConfig = `import {defineConfig} from 'vite';
import hydrogen from '@shopify/hydrogen/plugin';

export default defineConfig({
  plugins: [hydrogen()],
});`;
    
    vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
      filepath: '/test/vite.config.ts',
      extension: 'ts',
      astType: 'ts',
    });
    
    vi.mocked(fileUtils.replaceFileContent).mockImplementation(
      async (filepath, formatConfig, callback) => {
        const result = await callback(mockViteConfig);
        expect(result).toContain('import tailwindcss from \'@tailwindcss/vite\'');
        expect(result).toContain('tailwindcss()');
      }
    );

    await injectVitePlugin(mockRootDirectory, mockFormatConfig, {
      name: 'tailwindcss',
      path: '@tailwindcss/vite',
      isDefault: true,
    });
  });

  it('should not duplicate plugin if already exists', async () => {
    const mockViteConfigWithPlugin = `import {defineConfig} from 'vite';
import hydrogen from '@shopify/hydrogen/plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [hydrogen(), tailwindcss()],
});`;
    
    vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
      filepath: '/test/vite.config.ts',
      extension: 'ts',
      astType: 'ts',
    });
    
    vi.mocked(fileUtils.replaceFileContent).mockImplementation(
      async (filepath, formatConfig, callback) => {
        const result = await callback(mockViteConfigWithPlugin);
        if (result) {
          expect(result.match(/import tailwindcss/g)?.length).toBe(1);
          expect(result.match(/tailwindcss\(\)/g)?.length).toBe(1);
        }
      }
    );

    await injectVitePlugin(mockRootDirectory, mockFormatConfig, {
      name: 'tailwindcss',
      path: '@tailwindcss/vite',
      isDefault: true,
    });
  });

  it('should throw error when vite.config is not found', async () => {
    vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
      filepath: undefined,
      astType: undefined,
    });

    await expect(
      injectVitePlugin(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindcss',
        path: '@tailwindcss/vite',
        isDefault: true,
      })
    ).rejects.toThrow('Could not find vite.config file');
  });
});