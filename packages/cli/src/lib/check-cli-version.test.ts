import {
  checkCurrentCLIVersion,
  UPGRADABLE_CLI_NAMES,
} from './check-cli-version.js';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  checkForNewVersion,
  findUpAndReadPackageJson,
} from '@shopify/cli-kit/node/node-package-manager';

vi.mock('@shopify/cli-kit/node/node-package-manager', () => {
  return {
    checkForNewVersion: vi.fn(),
    packageManagerFromUserAgent: vi.fn(() => 'npm'),
    findUpAndReadPackageJson: vi.fn(() =>
      Promise.resolve({
        path: '',
        content: {
          name: UPGRADABLE_CLI_NAMES.cliHydrogen,
          version: '8.0.0',
        },
      }),
    ),
  };
});

describe('checkHydrogenVersion()', () => {
  const outputMock = mockAndCaptureOutput();

  afterEach(() => {
    vi.restoreAllMocks();
    outputMock.clear();
  });

  describe('when a current version is available', () => {
    it('calls checkForNewVersion', async () => {
      await checkCurrentCLIVersion();

      expect(checkForNewVersion).toHaveBeenCalledWith(
        UPGRADABLE_CLI_NAMES.cliHydrogen,
        expect.stringMatching(/\d{1,2}\.\d{1,2}\.\d{1,2}/),
      );
    });

    describe('and it is up to date', () => {
      beforeEach(() => {
        vi.mocked(checkForNewVersion).mockResolvedValue(undefined);
      });

      it('returns undefined', async () => {
        expect(await checkCurrentCLIVersion()).toBe(undefined);
      });
    });

    describe('and it is using @next or @exprimental', () => {
      it('returns undefined', async () => {
        vi.mocked(checkForNewVersion).mockResolvedValue('8.0.0');
        vi.mocked(findUpAndReadPackageJson).mockResolvedValueOnce({
          path: '',
          content: {
            name: UPGRADABLE_CLI_NAMES.cliHydrogen,
            version: '0.0.0-next-a188915-20230713115118',
          },
        });

        expect(await checkCurrentCLIVersion()).toBe(undefined);

        vi.mocked(findUpAndReadPackageJson).mockResolvedValueOnce({
          path: '',
          content: {
            name: UPGRADABLE_CLI_NAMES.cliHydrogen,
            version: '0.0.0-experimental-a188915-20230713115118',
          },
        });

        expect(await checkCurrentCLIVersion()).toBe(undefined);
      });
    });

    describe('and a new version is available', () => {
      beforeEach(() => {
        vi.mocked(checkForNewVersion).mockResolvedValue('9.0.0');
      });

      it('returns a function that prints the upgrade', async () => {
        const showUpgrade = await checkCurrentCLIVersion();
        expect(showUpgrade).toBeInstanceOf(Function);

        showUpgrade!();

        expect(outputMock.info()).toMatch(
          / info .+ Upgrade available .+ Version 9.0.0.+ running v8.0.0.+`npm create @shopify\/hydrogen@latest`/is,
        );
      });

      it('outputs a message to the user with the new version', async () => {
        const showUpgrade = await checkCurrentCLIVersion();
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
    beforeEach(() => {
      vi.mocked(findUpAndReadPackageJson).mockRejectedValue(new Error());
    });

    it('returns undefined and does not call checkForNewVersion', async () => {
      expect(await checkCurrentCLIVersion()).toBe(undefined);

      expect(checkForNewVersion).not.toHaveBeenCalled();
    });
  });
});
