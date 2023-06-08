import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

import {combinedEnvironmentVariables} from './combined-environment-variables.js';
import {pullRemoteEnvironmentVariables} from './pull-environment-variables.js';
import {getConfig} from './shopify-config.js';

vi.mock('./shopify-config.js');
vi.mock('./pull-environment-variables.js');

describe('combinedEnvironmentVariables()', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/1',
        title: 'Hydrogen',
      },
    });
    vi.mocked(pullRemoteEnvironmentVariables).mockResolvedValue([
      {
        id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
        key: 'PUBLIC_API_TOKEN',
        value: 'abc123',
        isSecret: false,
      },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  test('calls pullRemoteEnvironmentVariables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await combinedEnvironmentVariables({
        envBranch: 'main',
        root: tmpDir,
        shop: 'my-shop',
      });

      expect(pullRemoteEnvironmentVariables).toHaveBeenCalledWith({
        envBranch: 'main',
        root: tmpDir,
        flagShop: 'my-shop',
        silent: true,
      });
    });
  });

  test('renders a message about injection', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

      expect(outputMock.info()).toMatch(
        /Environment variables injected into MiniOxygen:/,
      );
    });
  });

  test('lists all of the variables being used', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

      expect(outputMock.info()).toMatch(/PUBLIC_API_TOKEN\s+from Oxygen/);
    });
  });

  describe('when one of the variables is a secret', () => {
    beforeEach(() => {
      vi.mocked(pullRemoteEnvironmentVariables).mockResolvedValue([
        {
          id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
          key: 'PUBLIC_API_TOKEN',
          value: '',
          isSecret: true,
        },
      ]);
    });

    test('uses special messaging to alert the user', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const outputMock = mockAndCaptureOutput();

        await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

        expect(outputMock.info()).toMatch(
          /PUBLIC_API_TOKEN\s+from Oxygen \(Marked as secret\)/,
        );
      });
    });
  });

  describe('when there are local variables', () => {
    test('includes local variables in the list', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, '.env');
        await writeFile(filePath, 'LOCAL_TOKEN=1');

        const outputMock = mockAndCaptureOutput();

        await combinedEnvironmentVariables({root: tmpDir});

        expect(outputMock.info()).toMatch(/LOCAL_TOKEN\s+from local \.env/);
      });
    });

    describe('and they overwrite remote variables', () => {
      test('uses special messaging to alert the user', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, '.env');
          await writeFile(filePath, 'PUBLIC_API_TOKEN=abc');

          const outputMock = mockAndCaptureOutput();

          await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

          expect(outputMock.info()).not.toMatch(
            /PUBLIC_API_TOKEN\s+from Oxygen/,
          );
          expect(outputMock.info()).toMatch(
            /PUBLIC_API_TOKEN\s+from local \.env/,
          );
        });
      });
    });
  });
});
