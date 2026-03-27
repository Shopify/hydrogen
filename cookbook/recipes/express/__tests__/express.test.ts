import {describe, expect, it, beforeAll} from 'vitest';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {loadRecipePatch} from '../../__test-utils__/index';

const RECIPE_DIR = join(__dirname, '..');

describe('express recipe', () => {
  let serverContent: string;

  beforeAll(async () => {
    serverContent = await readFile(
      join(RECIPE_DIR, 'ingredients/templates/skeleton/server.mjs'),
      'utf8',
    );
  });

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
      const content = await loadRecipePatch(RECIPE_DIR, 'entry.server.tsx');
      expect(content).toContain('renderToPipeableStream');
    });

    it('vite config patch references oxygen plugin', async () => {
      const content = await loadRecipePatch(RECIPE_DIR, 'vite.config.ts');
      expect(content).toContain('oxygen');
    });
  });

  describe('session management', () => {
    it('includes AppSession class with cookie session storage', () => {
      expect(serverContent).toContain('AppSession');
      expect(serverContent).toContain('createCookieSessionStorage');
    });

    it('AppSession implements required session methods', () => {
      const classMatch = serverContent.match(/class AppSession[\s\S]*?^}/m);
      if (!classMatch) {
        throw new Error('Expected AppSession class to be found in server.mjs');
      }
      const classBody = classMatch[0];

      const requiredMethods = [
        'get(',
        'set(',
        'destroy(',
        'flash(',
        'unset(',
        'commit(',
      ];
      for (const method of requiredMethods) {
        expect(classBody).toContain(method);
      }
    });
  });
});
