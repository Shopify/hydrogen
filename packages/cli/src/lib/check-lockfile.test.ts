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
