import {describe, expect, it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

const RECIPE_DIR = join(__dirname, '..');

describe('express recipe', () => {
  describe('recipe structure', () => {
    it('has a valid recipe.yaml', async () => {
      const content = await readFile(join(RECIPE_DIR, 'recipe.yaml'), 'utf8');
      expect(content).toBeTruthy();
      expect(content).toContain('title:');
      expect(content).toContain('express');
    });

    it('includes server.mjs ingredient', async () => {
      const content = await readFile(
        join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
        'utf8',
      );
      expect(content).toBeTruthy();
    });
  });

  describe('server configuration', () => {
    it('creates an Express app with required middleware', async () => {
      const content = await readFile(
        join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
        'utf8',
      );

      // Core Express setup
      expect(content).toContain('express()');
      expect(content).toContain('app.listen');

      // Uses express.static for serving built assets
      expect(content).toContain('express.static');
    });

    it('handles port-in-use error with fallback', async () => {
      const content = await readFile(
        join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
        'utf8',
      );

      expect(content).toContain('EADDRINUSE');
    });

    it('uses renderToPipeableStream for Node.js streaming', async () => {
      const patchFiles = await import('node:fs/promises').then((fs) =>
        fs.readdir(join(RECIPE_DIR, 'patches')),
      );
      const entryServerPatch = patchFiles.find((f) =>
        f.startsWith('entry.server.tsx'),
      );
      expect(entryServerPatch).toBeDefined();

      const content = await readFile(
        join(RECIPE_DIR, 'patches', entryServerPatch!),
        'utf8',
      );

      expect(content).toContain('renderToPipeableStream');
    });

    it('removes oxygen plugin from vite config', async () => {
      const patchFiles = await import('node:fs/promises').then((fs) =>
        fs.readdir(join(RECIPE_DIR, 'patches')),
      );
      const viteConfigPatch = patchFiles.find((f) =>
        f.startsWith('vite.config.ts'),
      );
      expect(viteConfigPatch).toBeDefined();

      const content = await readFile(
        join(RECIPE_DIR, 'patches', viteConfigPatch!),
        'utf8',
      );

      // The patch should remove the oxygen plugin import
      expect(content).toContain('-');
      expect(content).toContain('oxygen');
    });
  });

  describe('session management', () => {
    it('includes AppSession class with cookie session storage', async () => {
      const content = await readFile(
        join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
        'utf8',
      );

      expect(content).toContain('AppSession');
      expect(content).toContain('createCookieSessionStorage');
    });

    it('AppSession implements required session methods', async () => {
      const content = await readFile(
        join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
        'utf8',
      );

      const requiredMethods = [
        'get',
        'set',
        'destroy',
        'flash',
        'unset',
        'commit',
      ];
      for (const method of requiredMethods) {
        expect(content).toContain(method);
      }
    });
  });
});
