import {describe, it, expect} from 'vitest';
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {
  MARKER,
  getRunJsPath,
  isPatchApplied,
  generatePatchedContent,
  generateOriginalContent,
  applyPatch,
  removePatch,
} from './patch-cli.js';

function createTempFile(content: string): string {
  const dir = resolve(
    tmpdir(),
    `patch-cli-test-${Date.now()}-${Math.random()}`,
  );
  mkdirSync(dir, {recursive: true});
  const filePath = resolve(dir, 'run.js');
  writeFileSync(filePath, content);
  return filePath;
}

describe('patch-cli', () => {
  describe('MARKER', () => {
    it('is the expected string', () => {
      expect(MARKER).toBe('// [hydrogen-monorepo-patch]');
    });
  });

  describe('getRunJsPath', () => {
    it('resolves the correct path from root', () => {
      expect(getRunJsPath('/foo')).toBe(
        '/foo/node_modules/@shopify/cli/bin/run.js',
      );
    });
  });

  describe('isPatchApplied', () => {
    it('returns false for empty string', () => {
      expect(isPatchApplied('')).toBe(false);
    });

    it('returns false for content without marker', () => {
      expect(isPatchApplied('const x = 1;')).toBe(false);
    });

    it('returns true when marker is present', () => {
      expect(isPatchApplied(`${MARKER}\nsome content`)).toBe(true);
    });
  });

  describe('generatePatchedContent', () => {
    const content = generatePatchedContent();

    it('includes the marker', () => {
      expect(content).toContain(MARKER);
    });

    it('includes monorepo root detection', () => {
      expect(content).toContain('monorepoRoot');
    });

    it('includes pluginAdditions config', () => {
      expect(content).toContain('pluginAdditions');
    });

    it('includes oclif imports', () => {
      expect(content).toContain('@oclif/core');
    });

    it('sets IGNORE_HYDROGEN_MONOREPO env var', () => {
      expect(content).toContain('IGNORE_HYDROGEN_MONOREPO');
    });
  });

  describe('generateOriginalContent', () => {
    const content = generateOriginalContent();

    it('does not include the marker', () => {
      expect(content).not.toContain(MARKER);
    });

    it('includes the standard CLI entrypoint', () => {
      expect(content).toContain('runCLI({development: false})');
    });
  });

  describe('applyPatch', () => {
    it('writes patched content to an unpatched file and returns true', () => {
      const filePath = createTempFile(generateOriginalContent());
      expect(applyPatch(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).toBe(generatePatchedContent());
    });

    it('is idempotent — returns false if already patched', () => {
      const filePath = createTempFile(generatePatchedContent());
      expect(applyPatch(filePath)).toBe(false);
      expect(readFileSync(filePath, 'utf8')).toBe(generatePatchedContent());
    });
  });

  describe('removePatch', () => {
    it('restores original content and returns true', () => {
      const filePath = createTempFile(generatePatchedContent());
      expect(removePatch(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).toBe(generateOriginalContent());
    });

    it('is idempotent — returns false if not patched', () => {
      const filePath = createTempFile(generateOriginalContent());
      expect(removePatch(filePath)).toBe(false);
      expect(readFileSync(filePath, 'utf8')).toBe(generateOriginalContent());
    });
  });

  describe('round-trip', () => {
    it('apply then remove restores original content', () => {
      const original = generateOriginalContent();
      const filePath = createTempFile(original);

      applyPatch(filePath);
      expect(isPatchApplied(readFileSync(filePath, 'utf8'))).toBe(true);

      removePatch(filePath);
      expect(readFileSync(filePath, 'utf8')).toBe(original);
    });
  });
});
