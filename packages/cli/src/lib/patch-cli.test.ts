import {describe, it, expect, afterEach} from 'vitest';
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from 'node:fs';
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

const tempDirs: string[] = [];

function createTempFile(content: string): string {
  const dir = resolve(
    tmpdir(),
    `patch-cli-test-${Date.now()}-${Math.random()}`,
  );
  mkdirSync(dir, {recursive: true});
  tempDirs.push(dir);
  const filePath = resolve(dir, 'run.js');
  writeFileSync(filePath, content);
  return filePath;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, {recursive: true, force: true});
  }
  tempDirs.length = 0;
});

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

    it('throws when local plugin is not found', () => {
      expect(content).toContain(
        'Could not find local @shopify/cli-hydrogen plugin',
      );
    });

    it('throws when oclif internals changed', () => {
      expect(content).toContain('Cannot replace bundled commands');
    });

    it('verifies package name during monorepo detection', () => {
      expect(content).toContain("pkg.name === '@shopify/cli-hydrogen'");
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

    it('matches upstream @shopify/cli format with static import', () => {
      expect(content).toContain("import runCLI from '../dist/index.js'");
    });

    it('preserves upstream removeAllListeners call', () => {
      expect(content).toContain("process.removeAllListeners('warning')");
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

    it('creates a .backup file with original content', () => {
      const original = generateOriginalContent();
      const filePath = createTempFile(original);
      applyPatch(filePath);

      const backupPath = filePath + '.backup';
      expect(existsSync(backupPath)).toBe(true);
      expect(readFileSync(backupPath, 'utf8')).toBe(original);
    });

    it('does not overwrite an existing .backup file', () => {
      const original = 'first-original-content';
      const filePath = createTempFile(original);

      applyPatch(filePath);
      // Write new content, remove patch marker, and re-patch
      writeFileSync(filePath, 'second-original-content');
      applyPatch(filePath);

      const backupPath = filePath + '.backup';
      expect(readFileSync(backupPath, 'utf8')).toBe(original);
    });

    it('throws a friendly error when run.js does not exist', () => {
      const nonexistentPath = resolve(
        tmpdir(),
        `no-such-dir-${Date.now()}`,
        'run.js',
      );
      expect(() => applyPatch(nonexistentPath)).toThrow(
        '@shopify/cli is not installed',
      );
    });
  });

  describe('removePatch', () => {
    it('restores from .backup file when available', () => {
      const original = 'custom-original-content';
      const filePath = createTempFile(original);
      applyPatch(filePath);

      expect(removePatch(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).toBe(original);
    });

    it('falls back to generateOriginalContent when no .backup exists', () => {
      const filePath = createTempFile(generatePatchedContent());
      // No .backup file exists because we wrote patched content directly
      expect(removePatch(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).toBe(generateOriginalContent());
    });

    it('is idempotent — returns false if not patched', () => {
      const filePath = createTempFile(generateOriginalContent());
      expect(removePatch(filePath)).toBe(false);
      expect(readFileSync(filePath, 'utf8')).toBe(generateOriginalContent());
    });

    it('deletes the .backup file after restoring', () => {
      const original = 'custom-original-content';
      const filePath = createTempFile(original);
      applyPatch(filePath);

      const backupPath = filePath + '.backup';
      expect(existsSync(backupPath)).toBe(true);

      removePatch(filePath);
      expect(existsSync(backupPath)).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('apply then remove restores original content via backup', () => {
      const original = generateOriginalContent();
      const filePath = createTempFile(original);

      applyPatch(filePath);
      expect(isPatchApplied(readFileSync(filePath, 'utf8'))).toBe(true);

      removePatch(filePath);
      expect(readFileSync(filePath, 'utf8')).toBe(original);
    });
  });
});
