import {checkLockfileStatus} from './check-lockfile.js';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {file, path, git, outputMocker} from '@shopify/cli-kit';

vi.mock('@shopify/cli-kit', async () => {
  const cliKit: any = await vi.importActual('@shopify/cli-kit');

  return {
    ...cliKit,
    git: {
      factory: vi.fn(),
    },
  };
});

describe('checkLockfileStatus()', () => {
  const checkIgnoreMock = vi.fn();
  const gitFactoryMock = {
    checkIgnore: checkIgnoreMock,
  };

  beforeEach(() => {
    vi.mocked(git.factory).mockReturnValue(gitFactoryMock as any);
    vi.mocked(checkIgnoreMock).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    outputMocker.mockAndCaptureOutput().clear();
  });

  describe('when a lockfile is present', () => {
    it('does not call displayLockfileWarning', async () => {
      await file.inTemporaryDirectory(async (tmpDir) => {
        await file.write(path.join(tmpDir, 'package-lock.json'), '');
        const outputMock = outputMocker.mockAndCaptureOutput();

        await checkLockfileStatus(tmpDir);

        expect(outputMock.warn()).toBe('');
      });
    });

    describe('and it is being ignored by Git', () => {
      beforeEach(() => {
        vi.mocked(checkIgnoreMock).mockResolvedValue(['package-lock.json']);
      });

      it('renders a warning', async () => {
        await file.inTemporaryDirectory(async (tmpDir) => {
          await file.write(path.join(tmpDir, 'package-lock.json'), '');
          const outputMock = outputMocker.mockAndCaptureOutput();

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
      await file.inTemporaryDirectory(async (tmpDir) => {
        await file.write(path.join(tmpDir, 'package-lock.json'), '');
        await file.write(path.join(tmpDir, 'pnpm-lock.yaml'), '');

        const outputMock = outputMocker.mockAndCaptureOutput();

        await checkLockfileStatus(tmpDir);

        expect(outputMock.warn()).toMatch(
          / warning .+ Multiple lockfiles found .+/is,
        );
      });
    });
  });

  describe('when a lockfile is missing', () => {
    it('renders a warning', async () => {
      await file.inTemporaryDirectory(async (tmpDir) => {
        const outputMock = outputMocker.mockAndCaptureOutput();

        await checkLockfileStatus(tmpDir);

        expect(outputMock.warn()).toMatch(/ warning .+ No lockfile found .+/is);
      });
    });
  });
});
