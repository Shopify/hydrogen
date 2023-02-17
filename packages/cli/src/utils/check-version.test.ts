import {checkHydrogenVersion} from './check-version.js';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {outputMocker} from '@shopify/cli-kit';
import {checkForNewVersion} from '@shopify/cli-kit/node/node-package-manager';

vi.mock('@shopify/cli-kit/node/node-package-manager', () => {
  return {
    checkForNewVersion: vi.fn(),
  };
});

describe('checkHydrogenVersion()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when a current version is available', () => {
    it('calls checkForNewVersion', async () => {
      await checkHydrogenVersion('dir');

      expect(checkForNewVersion).toHaveBeenCalledWith(
        '@shopify/hydrogen',
        // Calver
        expect.stringMatching(/20\d{2}\.\d{1,2}\.\d{1,3}/),
      );
    });

    describe('and it is up to date', () => {
      beforeEach(() => {
        vi.mocked(checkForNewVersion).mockResolvedValue(undefined);
      });

      it('returns undefined', async () => {
        expect(await checkHydrogenVersion('dir')).toBe(undefined);
      });
    });

    describe('and a new version is available', () => {
      beforeEach(() => {
        vi.mocked(checkForNewVersion).mockResolvedValue('2023.1.5');
      });

      it('returns a function', async () => {
        expect(await checkHydrogenVersion('dir')).toBeInstanceOf(Function);
      });

      it('outputs a message to the user with the new version', async () => {
        const outputMock = outputMocker.mockAndCaptureOutput();
        const showUpgrade = await checkHydrogenVersion('dir');
        const {currentVersion, newVersion} = showUpgrade!();

        expect(outputMock.info()).toMatch(
          new RegExp(
            ` info .+ Upgrade available .+ Version ${newVersion.replaceAll(
              '.',
              '\\.',
            )}.+ running v${currentVersion.replaceAll('.', '\\.')}`,
            'is',
          ),
        );
      });
    });
  });

  describe('when no current version can be found', () => {
    it('returns undefined and does not call checkForNewVersion', async () => {
      expect(await checkHydrogenVersion('/fake-absolute-dir')).toBe(undefined);

      expect(checkForNewVersion).not.toHaveBeenCalled();
    });
  });
});
