import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

import {getAllEnvironmentVariables} from './environment-variables.js';
import {getStorefrontEnvVariables} from './graphql/admin/pull-variables.js';
import {getStorefrontEnvironments} from './graphql/admin/list-environments.js';
import {dummyListEnvironments} from './graphql/admin/test-helper.js';
import {login} from './auth.js';

vi.mock('./auth.js');
vi.mock('./graphql/admin/pull-variables.js');
vi.mock('./graphql/admin/list-environments.js');

describe('getAllEnvironmentVariables()', () => {
  const envFile = '.env';

  const ADMIN_SESSION = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  const SHOPIFY_CONFIG = {
    shop: 'my-shop',
    shopName: 'My Shop',
    email: 'email',
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
          readOnly: false,
        },
      ],
    });

    vi.mocked(getStorefrontEnvironments).mockResolvedValue(
      dummyListEnvironments(SHOPIFY_CONFIG.storefront.id),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('returns all variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const {allVariables} = await getAllEnvironmentVariables({
        root: tmpDir,
        envFile,
      });

      expect(allVariables).toMatchObject({PUBLIC_API_TOKEN: 'abc123'});
    });
  });

  it('calls pullRemoteEnvironmentVariables using handle', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await getAllEnvironmentVariables({
        envHandle: 'production',
        root: tmpDir,
        envFile,
      });

      expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
        ADMIN_SESSION,
        SHOPIFY_CONFIG.storefront.id,
        'production',
      );
    });
  });

  it('calls pullRemoteEnvironmentVariables using branch', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await getAllEnvironmentVariables({
        envBranch: 'main',
        root: tmpDir,
        envFile,
      });

      expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
        ADMIN_SESSION,
        SHOPIFY_CONFIG.storefront.id,
        'production',
      );
    });
  });

  it('does not call pullRemoteEnvironmentVariables when indicated', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await getAllEnvironmentVariables({
        envBranch: 'main',
        root: tmpDir,
        fetchRemote: false,
        envFile,
      });

      expect(getStorefrontEnvVariables).not.toHaveBeenCalled();
    });
  });

  it('returns a logger that renders information about variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      const {logInjectedVariables} = await getAllEnvironmentVariables({
        root: tmpDir,
        envFile,
      });

      logInjectedVariables();

      expect(outputMock.info()).toMatch(
        /Environment variables injected into MiniOxygen:/,
      );

      expect(outputMock.info()).toMatch(/PUBLIC_API_TOKEN\s+from Oxygen/);
    });
  });

  it('doest not fail on network errors', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      vi.mocked(getStorefrontEnvVariables).mockRejectedValue(
        new Error('Network error'),
      );

      const outputMock = mockAndCaptureOutput();

      const {logInjectedVariables} = await getAllEnvironmentVariables({
        root: tmpDir,
        envFile,
      });

      logInjectedVariables();

      expect(outputMock.info()).not.toMatch(/PUBLIC_API_TOKEN\s+from Oxygen/);
      expect(outputMock.warn()).toMatch(/failed to load/i);
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
            readOnly: false,
          },
        ],
      });
    });

    it('uses special messaging to alert the user', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const outputMock = mockAndCaptureOutput();

        const {logInjectedVariables} = await getAllEnvironmentVariables({
          root: tmpDir,
          envFile,
        });

        logInjectedVariables();

        expect(outputMock.info()).toMatch(
          /PUBLIC_API_TOKEN\s+from Oxygen \(Marked as secret\)/,
        );
      });
    });
  });

  describe('when there are local variables', () => {
    it('includes local variables in the list', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'LOCAL_TOKEN=1');

        const outputMock = mockAndCaptureOutput();

        const {logInjectedVariables} = await getAllEnvironmentVariables({
          root: tmpDir,
          envFile,
        });

        logInjectedVariables();

        expect(outputMock.info()).toMatch(/LOCAL_TOKEN\s+from local \.env/);
      });
    });

    describe('and they overwrite remote variables', () => {
      it('uses special messaging to alert the user', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, envFile);
          await writeFile(filePath, 'PUBLIC_API_TOKEN=abc');

          const outputMock = mockAndCaptureOutput();

          const {logInjectedVariables} = await getAllEnvironmentVariables({
            root: tmpDir,
            envFile,
          });

          logInjectedVariables();

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
