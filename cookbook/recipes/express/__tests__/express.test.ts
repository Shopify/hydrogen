import {describe, expect, it, beforeAll} from 'vitest';
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';

const RECIPE_DIR = join(__dirname, '..');

describe('express recipe', () => {
  let serverContent: string;
  let patchFiles: string[];

  beforeAll(async () => {
    serverContent = await readFile(
      join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
      'utf8',
    );
    patchFiles = await readdir(join(RECIPE_DIR, 'patches'));
  });

  function findPatchFile(prefix: string): string {
    const match = patchFiles.find((f) => f.startsWith(prefix));
    if (!match) {
      throw new Error(
        `Expected ${prefix} patch file to exist in patches directory`,
      );
    }
    return match;
  }

  describe('recipe structure', () => {
    it('has a valid recipe.yaml', async () => {
      const content = await readFile(join(RECIPE_DIR, 'recipe.yaml'), 'utf8');
      expect(content).toBeTruthy();
      expect(content).toContain('title:');
      expect(content).toContain('express');
    });

    it('includes server.mjs ingredient', () => {
      expect(serverContent).toBeTruthy();
    });
  });

  describe('server configuration', () => {
    it('creates an Express app with static file serving', () => {
      expect(serverContent).toContain('express()');
      expect(serverContent).toContain('app.listen');
      expect(serverContent).toContain('express.static');
    });

    it('handles port-in-use error with fallback', () => {
      expect(serverContent).toContain('EADDRINUSE');
    });

    it('uses renderToPipeableStream for Node.js streaming', async () => {
      const patchFile = findPatchFile('entry.server.tsx');
      const content = await readFile(
        join(RECIPE_DIR, 'patches', patchFile),
        'utf8',
      );
      expect(content).toContain('renderToPipeableStream');
    });

    it('removes oxygen plugin from vite config', async () => {
      const patchFile = findPatchFile('vite.config.ts');
      const content = await readFile(
        join(RECIPE_DIR, 'patches', patchFile),
        'utf8',
      );
      expect(content).toContain('oxygen');
    });
  });

  describe('session management', () => {
    it('includes AppSession class with cookie session storage', () => {
      expect(serverContent).toContain('AppSession');
      expect(serverContent).toContain('createCookieSessionStorage');
    });

    it('AppSession implements required session methods', () => {
      const requiredMethods = [
        'get(',
        'set(',
        'destroy(',
        'flash(',
        'unset(',
        'commit(',
      ];
      for (const method of requiredMethods) {
        expect(serverContent).toContain(method);
      }
    });
  });
});
