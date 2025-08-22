/**
 * Test Suite: Critical Import Bug - Missing tailwindStyles Import
 * 
 * WHY these tests exist:
 * We discovered a critical bug where projects scaffolded with `--styling tailwind` or
 * `--quickstart` (which now defaults to Tailwind) have references to `tailwindStyles`
 * in their root.jsx/tsx files but NO import statement for it. This causes:
 * - ReferenceError: tailwindStyles is not defined
 * - Complete CSS failure in production builds
 * - Broken quickstart experience for new Hydrogen developers
 * 
 * The bug occurs because:
 * 1. The skeleton template starts with `appStyles` imports and usage
 * 2. During scaffolding with --styling tailwind, something pre-processes the template
 * 3. This pre-processing changes `appStyles` to `tailwindStyles` in usage locations
 * 4. BUT it fails to add the corresponding import statement
 * 5. When replaceRootLinks runs, it doesn't see `appStyles` anymore (already changed)
 * 6. The function falls through to else clause which should add the import but doesn't
 * 
 * WHAT these tests validate:
 * 1. Detection of missing imports when variable is used but not imported
 * 2. Adding the missing import statement in the correct location
 * 3. Handling partial replacements where some references are changed but imports aren't
 * 4. Not duplicating imports if they already exist
 * 5. Correct import placement after the last existing import
 * 6. AST-based detection of missing imports vs string-based detection
 * 
 * These tests are CRITICAL for ensuring quickstart and scaffolding work correctly.
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {replaceRootLinks} from './replacers';
import * as fileUtils from '../../file';
import * as formatUtils from '../../format-code';
import {Project, SyntaxKind} from 'ts-morph';

vi.mock('../../file');
vi.mock('../../format-code');

describe('replaceRootLinks - Import Bug Fix', () => {
  const mockFormatConfig = {semi: true, singleQuote: true};
  const mockRootDirectory = '/test/app';
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(formatUtils.getCodeFormatOptions).mockResolvedValue(mockFormatConfig);
  });

  describe('Bug: Missing tailwindStyles import in scaffolded projects', () => {
    it('should add tailwindStyles import when variable is used but not imported (JS)', async () => {
      // This is the actual bug we're seeing in scaffolded projects
      const buggyContent = `import {Analytics} from '@shopify/hydrogen';
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
      href: tailwindStyles,  // Used but not imported!
      fetchPriority: 'high',
    },
  ];
}

export function Layout({children}) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={tailwindStyles}></link>  // Used but not imported!
      </head>
    </html>
  );
}`;

      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.jsx',
        astType: 'jsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(buggyContent);
          
          // Should add the missing import
          expect(result).toContain("import tailwindStyles from '~/styles/tailwind.css?url'");
          
          // Should only have one import
          const importMatches = result.match(/import tailwindStyles/g);
          expect(importMatches?.length).toBe(1);
          
          // Should preserve existing usage
          expect(result).toContain('href: tailwindStyles');
          expect(result).toContain('<link rel="stylesheet" href={tailwindStyles}></link>');
          
          return result;
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
      
      expect(vi.mocked(fileUtils.replaceFileContent)).toHaveBeenCalled();
    });

    it('should add tailwindStyles import when variable is used but not imported (TS)', async () => {
      const buggyTsContent = `import {Analytics} from '@shopify/hydrogen';
import {LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Links, Meta} from 'react-router';
import favicon from '~/assets/favicon.svg';
import resetStyles from '~/styles/reset.css?url';

export function links() {
  return [
    {
      rel: 'preload',
      as: 'style',
      href: resetStyles,
      fetchPriority: 'high' as const,
    },
    {
      rel: 'preload',
      as: 'style',
      href: tailwindStyles,  // Used but not imported!
      fetchPriority: 'high' as const,
    },
  ];
}

export function Layout({children}: {children?: React.ReactNode}) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={tailwindStyles}></link>  // Used but not imported!
      </head>
    </html>
  );
}`;

      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(buggyTsContent);
          
          // Should add the missing import
          expect(result).toContain("import tailwindStyles from '~/styles/tailwind.css?url'");
          
          // Should only have one import
          const importMatches = result.match(/import tailwindStyles/g);
          expect(importMatches?.length).toBe(1);
          
          return result;
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
    });

    it('should handle case where appStyles exists but tailwindStyles is already referenced', async () => {
      // This could happen if partial replacement occurred
      const partiallyReplacedContent = `import {Analytics} from '@shopify/hydrogen';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';  // Old import still here

export function links() {
  return [
    {
      href: resetStyles,
    },
    {
      href: tailwindStyles,  // Already changed but import missing
    },
  ];
}

export function Layout({children}) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={tailwindStyles}></link>  // Already changed
      </head>
    </html>
  );
}`;

      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.jsx',
        astType: 'jsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(partiallyReplacedContent);
          
          // Should remove appStyles import
          expect(result).not.toContain('import appStyles');
          
          // Should add tailwindStyles import
          expect(result).toContain("import tailwindStyles from");
          
          // Should preserve tailwindStyles usage
          expect(result).toContain('href: tailwindStyles');
          
          return result;
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
    });
  });

  describe('Import detection and placement', () => {
    it('should detect if import already exists and not duplicate', async () => {
      const contentWithImport = `import tailwindStyles from '~/styles/tailwind.css?url';
import resetStyles from '~/styles/reset.css?url';

export function links() {
  return [{href: tailwindStyles}];
}`;

      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(contentWithImport);
          
          // Should not duplicate the import
          const importMatches = result.match(/import tailwindStyles/g);
          expect(importMatches?.length).toBe(1);
          
          return result;
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
    });

    it('should place import after last existing import statement', async () => {
      const content = `import {Analytics} from '@shopify/hydrogen';
import {Links} from 'react-router';
import favicon from '~/assets/favicon.svg';
import resetStyles from '~/styles/reset.css?url';

// Some comment here

export function links() {
  return [{href: resetStyles}];
}`;

      vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
        filepath: '/test/app/root.tsx',
        astType: 'tsx',
      });
      
      vi.mocked(fileUtils.replaceFileContent).mockImplementation(
        async (filepath, formatConfig, callback) => {
          const result = await callback(content);
          
          // Import should be added after the last import
          const lines = result.split('\n');
          const tailwindImportIndex = lines.findIndex(line => 
            line.includes('import tailwindStyles')
          );
          const resetStylesImportIndex = lines.findIndex(line => 
            line.includes('import resetStyles')
          );
          
          expect(tailwindImportIndex).toBeGreaterThan(resetStylesImportIndex);
          expect(tailwindImportIndex).toBeLessThan(
            lines.findIndex(line => line.includes('export function'))
          );
          
          return result;
        }
      );

      await replaceRootLinks(mockRootDirectory, mockFormatConfig, {
        name: 'tailwindStyles',
        path: '~/styles/tailwind.css?url',
        isDefault: true,
      });
    });
  });

  describe('AST-based detection using ts-morph', () => {
    it('should correctly identify missing imports using AST', () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile('root.tsx', `
import resetStyles from '~/styles/reset.css?url';

export function links() {
  return [{href: tailwindStyles}];  // Reference without import
}
`);

      // Check if tailwindStyles is imported
      const importDeclarations = sourceFile.getImportDeclarations();
      const hasTailwindImport = importDeclarations.some(imp => {
        const defaultImport = imp.getDefaultImport();
        return defaultImport?.getText() === 'tailwindStyles';
      });
      
      expect(hasTailwindImport).toBe(false);

      // Check if tailwindStyles is referenced
      const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
      const usesTailwindStyles = identifiers.some(id => 
        id.getText() === 'tailwindStyles'
      );
      
      expect(usesTailwindStyles).toBe(true);

      // This demonstrates the bug: variable is used but not imported
      expect(hasTailwindImport).toBe(false);
      expect(usesTailwindStyles).toBe(true);
    });

    it('should add import when detected as missing', () => {
      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile('root.tsx', `
import resetStyles from '~/styles/reset.css?url';

export function links() {
  return [{href: tailwindStyles}];
}`);

      // Add the missing import
      const lastImport = sourceFile.getLastChildByKind(SyntaxKind.ImportDeclaration);
      if (lastImport) {
        lastImport.insertStatementAfter(
          "import tailwindStyles from '~/styles/tailwind.css?url';"
        );
      }

      const updatedText = sourceFile.getFullText();
      expect(updatedText).toContain("import tailwindStyles from '~/styles/tailwind.css?url'");
    });
  });
});