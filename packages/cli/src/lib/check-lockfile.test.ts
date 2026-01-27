import {checkLockfileStatus} from './check-lockfile.js';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {writeFile, inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {checkIfIgnoredInGitRepository} from '@shopify/cli-kit/node/git';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

describe('checkLockfileStatus()', () => {
  const checkIgnoreMock = vi.fn();
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.mock('@shopify/cli-kit/node/git');
    vi.mocked(checkIfIgnoredInGitRepository).mockImplementation(
      checkIgnoreMock,
    );
    vi.mocked(checkIgnoreMock).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    outputMock.clear();
  });

  describe('when a lockfile is present', () => {
    it('does not call displayLockfileWarning', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeFile(joinPath(tmpDir, 'package-lock.json'), '');

        await checkLockfileStatus(tmpDir);

        expect(outputMock.warn()).toBe('');
      });
    });

    it('detects npm-shrinkwrap.json (alternative npm lockfile)', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        // Create npm-shrinkwrap.json alongside another lockfile to trigger multiple lockfile warning
        await writeFile(joinPath(tmpDir, 'npm-shrinkwrap.json'), '');
        await writeFile(joinPath(tmpDir, 'yarn.lock'), '');

        await checkLockfileStatus(tmpDir);

        // Verify the warning shows npm-shrinkwrap.json (not package-lock.json)
        expect(outputMock.warn()).toMatch(
          /npm-shrinkwrap\.json \(created by npm\)/is,
        );
      });
    });

    it('detects bun.lock (text-based lockfile) and shows correct name in warnings', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        // Create bun.lock alongside another lockfile to trigger multiple lockfile warning
        await writeFile(joinPath(tmpDir, 'bun.lock'), '');
        await writeFile(joinPath(tmpDir, 'package-lock.json'), '');

        await checkLockfileStatus(tmpDir);

        // Verify the warning shows bun.lock (not bun.lockb)
        expect(outputMock.warn()).toMatch(/bun\.lock \(created by bun\)/is);
        expect(outputMock.warn()).not.toMatch(/bun\.lockb/is);
      });
    });

    it('detects bun.lockb (binary lockfile) and shows correct name in warnings', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        // Create bun.lockb alongside another lockfile to trigger multiple lockfile warning
        await writeFile(joinPath(tmpDir, 'bun.lockb'), '');
        await writeFile(joinPath(tmpDir, 'package-lock.json'), '');

        await checkLockfileStatus(tmpDir);

        // Verify the warning shows bun.lockb (not bun.lock)
        expect(outputMock.warn()).toMatch(/bun\.lockb \(created by bun\)/is);
        expect(outputMock.warn()).not.toMatch(/bun\.lock \(created by bun\)/is);
      });
    });

    describe('and it is being ignored by Git', () => {
      beforeEach(() => {
        vi.mocked(checkIgnoreMock).mockResolvedValue(['package-lock.json']);
      });

      it('renders a warning', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await writeFile(joinPath(tmpDir, 'package-lock.json'), '');

          await checkLockfileStatus(tmpDir);

          expect(outputMock.warn()).toMatch(
            / warning .+ Lockfile ignored by Git .+/is,
          );
        });
      });
    });
  });

  describe('when there are multiple lockfiles', () => {
    it('renders a warning', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeFile(joinPath(tmpDir, 'package-lock.json'), '');
        await writeFile(joinPath(tmpDir, 'pnpm-lock.yaml'), '');

        await checkLockfileStatus(tmpDir);

        expect(outputMock.warn()).toMatch(
          / warning .+ Multiple lockfiles found .+/is,
        );
        expect(outputMock.warn()).toMatch(
          /package-lock\.json \(created by npm\)/is,
        );
        expect(outputMock.warn()).toMatch(
          /pnpm-lock\.yaml \(created by pnpm\)/is,
        );
      });
    });

    it('throws when shouldExit is true', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeFile(joinPath(tmpDir, 'package-lock.json'), '');
        await writeFile(joinPath(tmpDir, 'pnpm-lock.yaml'), '');

        await expect(checkLockfileStatus(tmpDir, true)).rejects.toThrow(
          /Multiple lockfiles found/is,
        );
      });
    });
  });

  describe('when a lockfile is missing', () => {
    it('renders a warning', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await checkLockfileStatus(tmpDir);

        expect(outputMock.warn()).toMatch(/ warning .+ No lockfile found .+/is);
      });
    });

    it('throws when shouldExit is true', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await expect(checkLockfileStatus(tmpDir, true)).rejects.toThrow(
          /No lockfile found/is,
        );
      });
    });
  });
});
