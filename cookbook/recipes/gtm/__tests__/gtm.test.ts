import {describe, expect, it, beforeAll} from 'vitest';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {loadRecipePatch} from '../../__test-utils__/index';

const RECIPE_DIR = join(__dirname, '..');
const COMPONENT_PATH = join(
  RECIPE_DIR,
  'ingredients/templates/skeleton/app/components/GoogleTagManager.tsx',
);

describe('gtm recipe', () => {
  let componentContent: string;

  beforeAll(async () => {
    componentContent = await readFile(COMPONENT_PATH, 'utf8');
  });

  describe('recipe structure', () => {
    it('has a valid recipe.yaml', async () => {
      const content = await readFile(join(RECIPE_DIR, 'recipe.yaml'), 'utf8');
      expect(content).toBeTruthy();
      expect(content).toContain('title:');
      expect(content).toContain('Google Tag Manager');
    });

    it('includes GoogleTagManager component ingredient', () => {
      expect(componentContent).toContain('useAnalytics');
      expect(componentContent).toContain('dataLayer');
    });
  });

  describe('CSP configuration', () => {
    it('entry.server patch includes GTM domains in CSP directives', async () => {
      const patchContent = await loadRecipePatch(
        RECIPE_DIR,
        'entry.server.tsx',
      );

      expect(patchContent).toContain('googletagmanager.com');
      expect(patchContent).toContain('google-analytics.com');
    });
  });

  describe('GoogleTagManager component', () => {
    it('pushes events to window.dataLayer', () => {
      expect(componentContent).toContain('window.dataLayer');
      expect(componentContent).toContain('.push(');
    });

    it('uses useAnalytics hook for Hydrogen analytics integration', () => {
      expect(componentContent).toContain('import {useAnalytics}');
    });
  });
});
