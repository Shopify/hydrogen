import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

import {combinedEnvironmentVariables} from './combined-environment-variables.js';
import {getStorefrontEnvVariables} from './graphql/admin/pull-variables.js';
import {login} from './auth.js';

vi.mock('./auth.js');
vi.mock('./graphql/admin/pull-variables.js');

describe('combinedEnvironmentVariables()', () => {
  const ADMIN_SESSION = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  const SHOPIFY_CONFIG = {
    storefront: {
      id: 'gid://shopify/HydrogenStorefront/1',
      title: 'Hydrogen',
    },
  };

  beforeEach(() => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
          key: 'PUBLIC_API_TOKEN',
          value: 'abc123',
          isSecret: false,
        },
      ],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('calls pullRemoteEnvironmentVariables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await combinedEnvironmentVariables({
        envBranch: 'main',
        root: tmpDir,
        shop: 'my-shop',
      });

      expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
        ADMIN_SESSION,
        SHOPIFY_CONFIG.storefront.id,
        'main',
      );
    });
  });

  it('renders a message about injection', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

      expect(outputMock.info()).toMatch(
        /Environment variables injected into MiniOxygen:/,
      );
    });
  });

  it('lists all of the variables being used', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

      expect(outputMock.info()).toMatch(/PUBLIC_API_TOKEN\s+from Oxygen/);
    });
  });

  describe('when one of the variables is a secret', () => {
    beforeEach(() => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'PUBLIC_API_TOKEN',
            value: '',
            isSecret: true,
          },
        ],
      });
    });

    it('uses special messaging to alert the user', async () => {
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
    it('includes local variables in the list', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, '.env');
        await writeFile(filePath, 'LOCAL_TOKEN=1');

        const outputMock = mockAndCaptureOutput();

        await combinedEnvironmentVariables({root: tmpDir, shop: 'my-shop'});

        expect(outputMock.info()).toMatch(/LOCAL_TOKEN\s+from local \.env/);
      });
    });

    describe('and they overwrite remote variables', () => {
      it('uses special messaging to alert the user', async () => {
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
