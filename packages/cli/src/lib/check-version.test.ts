import {checkHydrogenVersion} from './check-version.js';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {checkForNewVersion} from '@shopify/cli-kit/node/node-package-manager';
import {CLI_KIT_VERSION} from '@shopify/cli-kit/common/version';

vi.mock('@shopify/cli-kit/node/node-package-manager', () => {
  return {
    checkForNewVersion: vi.fn(),
  };
});

const requireMock = vi.fn();
vi.mock('node:module', async () => {
  const {createRequire} = await vi.importActual<typeof import('node:module')>(
    'node:module',
  );

  return {
    createRequire: (url: string) => {
      const actualRequire = createRequire(url);
      requireMock.mockImplementation((mod: string) => actualRequire(mod));
      const require = requireMock as unknown as typeof actualRequire;
      require.resolve = actualRequire.resolve.bind(actualRequire);

      return require;
    },
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

    describe('and it is using @next', () => {
      it('returns undefined', async () => {
        vi.mocked(checkForNewVersion).mockResolvedValue('2023.1.5');
        vi.mocked(requireMock).mockReturnValueOnce({
          version: '0.0.0-next-a188915-20230713115118',
        });

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

  describe('when checking the global cli version', () => {
    it('uses the CLI_KIT_VERSION', async () => {
      await checkHydrogenVersion('dir', 'cli');

      expect(checkForNewVersion).toHaveBeenCalledWith(
        '@shopify/cli',
        CLI_KIT_VERSION,
      );
    });
  });

  describe('when no current version can be found', () => {
    it('returns undefined and does not call checkForNewVersion', async () => {
      expect(await checkHydrogenVersion('/fake-absolute-dir')).toBe(undefined);

      expect(checkForNewVersion).not.toHaveBeenCalled();
    });
  });
});
