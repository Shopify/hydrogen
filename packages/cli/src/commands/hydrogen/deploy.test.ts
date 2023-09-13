import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {type AdminSession, login} from '../../lib/auth.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  renderSelectPrompt,
  renderFatalError,
  renderSuccess,
} from '@shopify/cli-kit/node/ui';

import {deploymentLogger, oxygenDeploy} from './deploy.js';
import {getOxygenDeploymentToken} from '../../lib/get-oxygen-token.js';
import {createDeploy, parseToken} from '@shopify/oxygen-cli/deploy';

vi.mock('../../lib/get-oxygen-token.js');
vi.mock('@shopify/oxygen-cli/deploy');
vi.mock('../../lib/auth.js');
vi.mock('../../lib/shopify-config.js');
vi.mock('../../lib/graphql/admin/link-storefront.js');
vi.mock('../../lib/graphql/admin/create-storefront.js');
vi.mock('../../lib/graphql/admin/fetch-job.js');
vi.mock('../../lib/shell.js', () => ({getCliCommand: () => 'h2'}));
vi.mock('@shopify/cli-kit/node/output', async () => {
  return {
    outputContent: () => ({value: ''}),
    outputInfo: () => {},
  };
});
vi.mock('@shopify/cli-kit/node/ui', async () => {
  return {
    renderFatalError: vi.fn(),
    renderSelectPrompt: vi.fn(),
    renderSuccess: vi.fn(),
    renderTasks: vi.fn(),
  };
});

describe('deploy', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop.myshopify.com',
  };

  const FULL_SHOPIFY_CONFIG = {
    shop: 'my-shop.myshopify.com',
    shopName: 'My Shop',
    email: 'email',
    storefront: {
      id: 'gid://shopify/HydrogenStorefront/1',
      title: 'Hydrogen',
    },
  };

  const UNLINKED_SHOPIFY_CONFIG = {
    ...FULL_SHOPIFY_CONFIG,
    storefront: undefined,
  };
  const originalExit = process.exit;

  const deployParams = {
    path: './',
    shop: 'snowdevil.myshopify.com',
    publicDeployment: false,
    metadataUrl: 'https://example.com',
    metadataUser: 'user',
    metadataVersion: '1.0.0',
  };

  const mockToken = {
    accessToken: 'some-token',
    allowedResource: 'some-resource',
    appId: '1',
    client: '1',
    expiresAt: 'some-time',
    namespace: 'some-namespace',
    namespaceId: '1',
  };

  beforeEach(async () => {
    process.exit = vi.fn() as any;
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: UNLINKED_SHOPIFY_CONFIG,
    });
    vi.mocked(getStorefronts).mockResolvedValue([
      {
        ...FULL_SHOPIFY_CONFIG.storefront,
        parsedId: '1',
        productionUrl: 'https://example.com',
      },
    ]);
    vi.mocked(renderSelectPrompt).mockResolvedValue(FULL_SHOPIFY_CONFIG.shop);
    vi.mocked(createDeploy).mockResolvedValue(
      'https://a-lovely-deployment.com',
    );
    vi.mocked(getOxygenDeploymentToken).mockResolvedValue('some-encoded-token');
    vi.mocked(parseToken).mockReturnValue(mockToken);
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.exit = originalExit;
  });

  it('calls getOxygenDeploymentToken with the correct parameters', async () => {
    await oxygenDeploy(deployParams);
    expect(getOxygenDeploymentToken).toHaveBeenCalledWith({
      root: './',
      flagShop: 'snowdevil.myshopify.com',
    });
    expect(getOxygenDeploymentToken).toHaveBeenCalledTimes(1);
  });

  it('calls createDeploy with the correct parameters', async () => {
    await oxygenDeploy(deployParams);

    const expectedConfig = {
      assetsDir: 'dist/client',
      deploymentUrl: 'https://oxygen.shopifyapps.com',
      deploymentToken: mockToken,
      healthCheckMaxDuration: 180,
      metadata: {
        url: deployParams.metadataUrl,
        user: deployParams.metadataUser,
        version: deployParams.metadataVersion,
      },
      publicDeployment: deployParams.publicDeployment,
      skipHealthCheck: false,
      rootPath: deployParams.path,
      skipBuild: false,
      workerOnly: false,
      workerDir: 'dist/worker',
    };

    expect(vi.mocked(createDeploy)).toHaveBeenCalledWith({
      config: expectedConfig,
      hooks: {
        buildFunction: expect.any(Function),
        onHealthCheckComplete: expect.any(Function),
        onUploadFilesStart: expect.any(Function),
        onUploadFilesComplete: expect.any(Function),
        onHealthCheckError: expect.any(Function),
        onUploadFilesError: expect.any(Function),
      },
      logger: deploymentLogger,
    });
    expect(vi.mocked(renderSuccess)).toHaveBeenCalled;
  });

  it('handles error during uploadFiles', async () => {
    const mockRenderFatalError = vi.fn();
    vi.mocked(renderFatalError).mockImplementation(mockRenderFatalError);

    const error = new Error('Wonky internet!');

    vi.mocked(createDeploy).mockImplementation((options) => {
      options.hooks?.onUploadFilesStart?.();
      options.hooks?.onUploadFilesError?.(error);

      return new Promise((_resolve, reject) => {
        reject(error);
      }) as Promise<string | undefined>;
    });

    try {
      await oxygenDeploy(deployParams);
      expect(true).toBe(false);
    } catch (err) {
      if (err instanceof AbortError) {
        expect(err.message).toBe(error.message);
        expect(err.tryMessage).toBe(
          'Check your connection and try again. If the problem persists, try again later or contact support.',
        );
      } else {
        expect(true).toBe(false);
      }
    }
  });

  it('handles error during health check', async () => {
    const mockRenderFatalError = vi.fn();
    vi.mocked(renderFatalError).mockImplementation(mockRenderFatalError);

    const error = new Error('Cloudflare is down!');

    vi.mocked(createDeploy).mockImplementation((options) => {
      options.hooks?.onUploadFilesStart?.();
      options.hooks?.onUploadFilesComplete?.();
      options.hooks?.onHealthCheckError?.(error);

      return new Promise((_resolve, reject) => {
        reject(error);
      }) as Promise<string | undefined>;
    });

    try {
      await oxygenDeploy(deployParams);
      expect(true).toBe(false);
    } catch (err) {
      if (err instanceof AbortError) {
        expect(err.message).toBe(error.message);
        expect(err.tryMessage).toBe(
          'Please verify the deployment status in the Shopify Admin and retry deploying if necessary.',
        );
      } else {
        expect(true).toBe(false);
      }
    }
  });
});
