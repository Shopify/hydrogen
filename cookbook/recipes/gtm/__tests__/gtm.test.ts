import {describe, expect, it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

const RECIPE_DIR = join(__dirname, '..');

describe('gtm recipe', () => {
  describe('recipe structure', () => {
    it('has a valid recipe.yaml', async () => {
      const content = await readFile(join(RECIPE_DIR, 'recipe.yaml'), 'utf8');
      expect(content).toBeTruthy();
      expect(content).toContain('title:');
      expect(content).toContain('Google Tag Manager');
    });

    it('includes GoogleTagManager component ingredient', async () => {
      const componentPath = join(
        RECIPE_DIR,
        'ingredients/templates/skeleton/app/components/GoogleTagManager.tsx',
      );
      const content = await readFile(componentPath, 'utf8');

      expect(content).toContain('useAnalytics');
      expect(content).toContain('dataLayer');
    });
  });

  describe('CSP configuration', () => {
    it('entry.server patch includes GTM domains in CSP directives', async () => {
      const patchFiles = await import('node:fs/promises').then((fs) =>
        fs.readdir(join(RECIPE_DIR, 'patches')),
      );
      const entryServerPatch = patchFiles.find((f) =>
        f.startsWith('entry.server.tsx'),
      );
      expect(entryServerPatch).toBeDefined();

      const patchContent = await readFile(
        join(RECIPE_DIR, 'patches', entryServerPatch!),
        'utf8',
      );

      // GTM requires these domains in CSP
      expect(patchContent).toContain('googletagmanager.com');
      expect(patchContent).toContain('google-analytics.com');
    });
  });

  describe('GoogleTagManager component', () => {
    it('pushes events to window.dataLayer', async () => {
      const content = await readFile(
        join(
          RECIPE_DIR,
          'ingredients/templates/skeleton/app/components/GoogleTagManager.tsx',
        ),
        'utf8',
      );

      expect(content).toContain('window.dataLayer');
      expect(content).toContain('.push(');
    });

    it('uses useAnalytics hook for Hydrogen analytics integration', async () => {
      const content = await readFile(
        join(
          RECIPE_DIR,
          'ingredients/templates/skeleton/app/components/GoogleTagManager.tsx',
        ),
        'utf8',
      );

      expect(content).toContain('import {useAnalytics}');
    });
  });
});
