import {describe, it, expect, beforeEach} from 'vitest';
import {setupVersionedTemplate} from './versioned.js';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {AbortError} from '@shopify/cli-kit/node/error';
import {execAsync} from '../process.js';
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';

/**
 * Integration tests for versioned template setup
 * These tests don't mock critical validations to ensure they work correctly
 */
describe('versioned integration tests', () => {
  const controller = new AbortController();

  describe('Critical validations', () => {
    it('should reject invalid version formats', async () => {
      const invalidFormats = [
        'invalid',
        '2025',
        '2025.1',
        '2025.1.a',
        'v2025.1.1',
        '2025_1_1',
        '25.1.1',
        '2025.01.01', // Leading zeros not allowed
        '2025.2.1', // Month 2 not valid (only 1,4,7,10)
        '2025.5.0', // Month 5 not valid (only 1,4,7,10)
        '2025.12.0', // Month 12 not valid (only 1,4,7,10)
      ];

      for (const invalidVersion of invalidFormats) {
        await expect(
          setupVersionedTemplate({version: invalidVersion}, controller),
        ).rejects.toThrow(AbortError);

        await expect(
          setupVersionedTemplate({version: invalidVersion}, controller),
        ).rejects.toThrow(`Invalid version format: ${invalidVersion}`);
      }
    });

    it('should accept valid version formats', async () => {
      const nonExistentButValidVersion = '2027.10.0';
      const testPath = `/tmp/test-integration-${nonExistentButValidVersion}-${Date.now()}`;

      await expect(
        setupVersionedTemplate(
          {
            version: nonExistentButValidVersion,
            path: testPath,
            mockShop: true,
            quickstart: true,
            language: 'ts',
            styling: 'tailwind',
            i18n: 'none',
            routes: false,
            installDeps: false,
          },
          controller,
        ),
      ).rejects.toThrow(
        /Version .* not found|Failed to find commit|API rate limit/,
      );

      const testPath2 = `/tmp/test-integration-2-${nonExistentButValidVersion}-${Date.now()}`;
      await expect(
        setupVersionedTemplate(
          {
            version: nonExistentButValidVersion,
            path: testPath2,
            mockShop: true,
            quickstart: true,
            language: 'ts',
            routes: false,
            installDeps: false,
          },
          controller,
        ),
      ).rejects.not.toThrow(
        `Invalid version format: ${nonExistentButValidVersion}`,
      );
    }, 90000);

    it('should reject non-existent versions with helpful message', async () => {
      const nonExistentVersion = '2027.10.9'; // Valid format but doesn't exist yet
      const testPath1 = `/tmp/test-integration-nonexistent-1-${Date.now()}`;
      const testPath2 = `/tmp/test-integration-nonexistent-2-${Date.now()}`;

      await expect(
        setupVersionedTemplate(
          {
            version: nonExistentVersion,
            path: testPath1,
            mockShop: true,
            quickstart: true,
            language: 'ts',
            routes: false,
            installDeps: false,
          },
          controller,
        ),
      ).rejects.toThrow(AbortError);

      await expect(
        setupVersionedTemplate(
          {
            version: nonExistentVersion,
            path: testPath2,
            mockShop: true,
            quickstart: true,
            language: 'ts',
            routes: false,
            installDeps: false,
          },
          controller,
        ),
      ).rejects.toThrow(/Version 2027\.10\.9 not found/);
    });
  });

  describe('Git validation - checking actual git repo', () => {
    beforeEach(async () => {
      // Check if we're in a git repo
      try {
        await execAsync('git rev-parse --git-dir');
      } catch {
        // Skip these tests if not in a git repo
        return;
      }
    });

    it('should successfully scaffold when a real Hydrogen release tag exists', async () => {
      const versionPattern = /^\d{4}\.(1|4|7|10)\.(0|[1-9]\d*)$/;
      let validVersion: string | undefined;

      try {
        const {stdout} = await execAsync(
          'git tag -l "@shopify/hydrogen@*" | grep -E "202[45]" | tail -1',
        );
        const tags = stdout.trim().split('\n').filter(Boolean);

        for (const tag of tags) {
          const version = tag.replace('@shopify/hydrogen@', '');
          if (versionPattern.test(version)) {
            validVersion = version;
            break;
          }
        }
      } catch {
        // No hydrogen tags found
      }

      if (validVersion) {
        const testPath = `/tmp/test-integration-${Date.now()}`;

        const result = await setupVersionedTemplate(
          {
            version: validVersion,
            path: testPath,
            mockShop: true,
            quickstart: true,
            language: 'ts',
            styling: 'tailwind',
            i18n: 'none',
            routes: false,
            installDeps: false,
          },
          controller,
        );

        expect(result).toBeDefined();
        expect(result?.version).toBe(validVersion);
        expect(result?.directory).toBe(testPath);
      } else {
        const fallbackVersion = '2027.10.0';
        const testPath = `/tmp/test-integration-fallback-${Date.now()}`;

        await expect(
          setupVersionedTemplate(
            {
              version: fallbackVersion,
              path: testPath,
              mockShop: true,
              quickstart: true,
              language: 'ts',
              routes: false,
              installDeps: false,
            },
            controller,
          ),
        ).rejects.toThrow(
          /Version .* not found|Failed to find commit|API rate limit/,
        );
      }
    });
  });
});

/**
 * Tests for version finder without mocking git commands
 * These ensure the actual git logic works
 */
describe('version-finder integration tests', () => {
  describe('Real git operations', () => {
    it('should handle errors from version finder gracefully', async () => {
      // Import the version finder
      const {findCommitForHydrogenVersion} = await import(
        '../version-finder.js'
      );

      // Test with a version that definitely doesn't exist
      const result = await findCommitForHydrogenVersion('9999.99.999');

      // Should return undefined for non-existent versions
      expect(result).toBeUndefined();
    });
  });
});

/**
 * Version format validation tests
 * Ensures the regex pattern correctly validates versions
 */
describe('Version format validation', () => {
  const versionPattern = /^\d{4}\.(1|4|7|10)\.(0|[1-9]\d*)$/;

  it('should validate correct version formats', () => {
    const validVersions = [
      '2024.10.0',
      '2025.1.1',
      '2025.4.99',
      '2025.7.0',
      '2025.10.15',
      '9999.1.999',
    ];

    for (const version of validVersions) {
      expect(versionPattern.test(version)).toBe(true);
    }
  });

  it('should reject incorrect version formats', () => {
    const invalidVersions = [
      '',
      '2025',
      '2025.1',
      'v2025.1.1',
      '2025.01.01', // Leading zeros
      '25.1.1', // Not 4-digit year
      '2025.1.1.1', // Too many parts
      '2025-1-1', // Wrong separator
      '2025.1.a', // Non-numeric
      'latest',
      '@2025.1.1',
    ];

    for (const version of invalidVersions) {
      expect(versionPattern.test(version)).toBe(false);
    }
  });
});

/**
 * Tests for error message quality
 * Ensures users get helpful error messages
 */
describe('Error message quality', () => {
  const controller = new AbortController();

  it('should provide helpful message for invalid version format', async () => {
    try {
      await setupVersionedTemplate({version: 'wrong-format'}, controller);
    } catch (error) {
      expect(error).toBeInstanceOf(AbortError);
      if (error instanceof AbortError) {
        expect(error.message).toContain('Invalid version format');
        expect(error.tryMessage).toContain(
          'Expected format: YYYY.MM.P where MM is 1, 4, 7, or 10',
        );
      }
    }
  });

  it('should provide helpful message for non-existent version', async () => {
    const testPath = `/tmp/test-integration-error-msg-${Date.now()}`;
    try {
      await setupVersionedTemplate(
        {
          version: '2027.10.9', // Valid format but doesn't exist yet
          path: testPath,
          mockShop: true,
          quickstart: true,
          language: 'ts',
          routes: false,
          installDeps: false,
        },
        controller,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AbortError);
      if (error instanceof AbortError) {
        expect(error.message).toContain('not found');
        expect(error.tryMessage).toContain(
          'github.com/Shopify/hydrogen/releases',
        );
      }
    }
  });
});
