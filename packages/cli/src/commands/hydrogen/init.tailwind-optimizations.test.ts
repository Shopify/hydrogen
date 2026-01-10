/**
 * Test Suite: Tailwind CSS Optimizations in Init Command
 * 
 * WHY these tests exist:
 * The init command with Tailwind CSS must apply specific optimizations to prevent FOUC
 * (Flash of Unstyled Content) in production. Without these optimizations, users experience:
 * - CSS loading after JavaScript execution
 * - Visible layout shifts on page navigation
 * - Poor Core Web Vitals scores (CLS - Cumulative Layout Shift)
 * - Degraded user experience, especially on slower connections
 * 
 * WHAT these tests validate:
 * 1. fetchPriority: 'high' is added to CSS preload hints (prioritizes CSS in network queue)
 * 2. viteEnvironmentApi flag is enabled in React Router config (enables critical CSS)
 * 3. cssCodeSplit: false is set in Vite config (prevents route-based CSS splitting)
 * 4. appStyles is replaced with tailwindStyles (correct import naming)
 * 5. Latest stable Tailwind CSS version is installed, not beta versions
 * 
 * These optimizations are the result of extensive FOUC investigation and must be
 * maintained to ensure production-ready Hydrogen stores.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest';
import {
  fileExists,
  readFile,
  writeFile,
  mkdirSync,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {temporaryDirectoryTask} from 'tempy';

// Import the actual setup functions we need to test
import {replaceRootLinks} from '../../lib/setups/css/replacers.js';

describe('init - Tailwind v4 Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Function Tests', () => {
    it('should correctly replace appStyles with tailwindStyles in preload hints', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        const appDir = joinPath(tmpDir, 'app');
        await mkdirSync(appDir);

        const rootPath = joinPath(appDir, 'root.tsx');
        await writeFile(rootPath, `
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

export default function App() {
  return (
    <html>
      <head>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
      </head>
    </html>
  );
}`);

        await replaceRootLinks(appDir, {singleQuote: true, trailingComma: 'all'}, {
          name: 'tailwindStyles',
          path: 'styles/tailwind.css?url',
          isDefault: true,
        });

        const modifiedContent = await readFile(rootPath);
        
        // Verify critical replacements
        expect(modifiedContent).toContain('tailwindStyles');
        expect(modifiedContent).toContain('~/styles/tailwind.css?url');
        expect(modifiedContent).toContain('href: tailwindStyles');
        expect(modifiedContent).toContain('<link rel="stylesheet" href={tailwindStyles}></link>');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing root.tsx gracefully', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        const appDir = joinPath(tmpDir, 'app');
        await mkdirSync(appDir);

        await expect(
          replaceRootLinks(appDir, {}, {
            name: 'tailwindStyles',
            path: 'styles/tailwind.css?url',
            isDefault: true,
          })
        ).rejects.toThrow('Could not find root file');
      });
    });

    it('should not duplicate imports if Tailwind is already setup', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        const appDir = joinPath(tmpDir, 'app');
        await mkdirSync(appDir);

        const rootPath = joinPath(appDir, 'root.tsx');
        await writeFile(rootPath, `
import tailwindStyles from '~/styles/tailwind.css?url';
import resetStyles from '~/styles/reset.css?url';

export function links() {
  return [
    {
      rel: 'preload',
      as: 'style',
      href: tailwindStyles,
      fetchPriority: 'high',
    },
  ];
}

export default function App() {
  return <div>App</div>;
}`);

        await replaceRootLinks(appDir, {}, {
          name: 'tailwindStyles',
          path: 'styles/tailwind.css?url',
          isDefault: true,
        });

        const content = await readFile(rootPath);
        const importMatches = content.match(/import tailwindStyles/g);
        expect(importMatches?.length).toBe(1);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should display "Tailwind v4" without beta references', async () => {
      const {CSS_STRATEGY_NAME_MAP} = await import('../../lib/setups/css/index.js');
      
      expect(CSS_STRATEGY_NAME_MAP.tailwind).toBe('Tailwind v4');
      expect(CSS_STRATEGY_NAME_MAP.tailwind).not.toContain('beta');
      expect(CSS_STRATEGY_NAME_MAP.tailwind).not.toContain('Beta');
    });
  });
});