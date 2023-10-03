import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {type AdminSession, login} from '../../lib/auth.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  renderSelectPrompt,
  renderFatalError,
  renderSuccess,
} from '@shopify/cli-kit/node/ui';
import {getLatestGitCommit} from '@shopify/cli-kit/node/git';

import {deploymentLogger, oxygenDeploy} from './deploy.js';
import {getOxygenDeploymentData} from '../../lib/get-oxygen-deployment-data.js';
import {createDeploy, parseToken} from '@shopify/oxygen-cli/deploy';

vi.mock('../../lib/get-oxygen-deployment-data.js');
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
    outputWarn: () => {},
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
vi.mock('@shopify/cli-kit/node/git', async () => {
  return {
    getLatestGitCommit: vi.fn(),
  };
});
vi.mock('@shopify/cli-kit/node/context/local', async () => {
  return {
    ciPlatform: () => ({isCI: false}),
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

  const expectedConfig = {
    assetsDir: 'dist/client',
    deploymentUrl: 'https://oxygen.shopifyapps.com',
    deploymentToken: mockToken,
    verificationMaxDuration: 180,
    metadata: {
      url: deployParams.metadataUrl,
      user: deployParams.metadataUser,
      version: deployParams.metadataVersion,
    },
    publicDeployment: deployParams.publicDeployment,
    skipVerification: false,
    rootPath: deployParams.path,
    skipBuild: false,
    workerOnly: false,
    workerDir: 'dist/worker',
  };

  const expectedHooks = {
    buildFunction: expect.any(Function),
    onVerificationComplete: expect.any(Function),
    onUploadFilesStart: expect.any(Function),
    onUploadFilesComplete: expect.any(Function),
    onVerificationError: expect.any(Function),
    onUploadFilesError: expect.any(Function),
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
    vi.mocked(getOxygenDeploymentData).mockResolvedValue({
      oxygenDeploymentToken: 'some-encoded-token',
      environments: [],
    });
    vi.mocked(parseToken).mockReturnValue(mockToken);
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.exit = originalExit;
  });

  it('calls getOxygenDeploymentData with the correct parameters', async () => {
    await oxygenDeploy(deployParams);
    expect(getOxygenDeploymentData).toHaveBeenCalledWith({
      root: './',
      flagShop: 'snowdevil.myshopify.com',
    });
    expect(getOxygenDeploymentData).toHaveBeenCalledTimes(1);
  });

  it('calls createDeploy with the correct parameters', async () => {
    await oxygenDeploy(deployParams);

    expect(vi.mocked(createDeploy)).toHaveBeenCalledWith({
      config: expectedConfig,
      hooks: expectedHooks,
      logger: deploymentLogger,
    });
    expect(vi.mocked(renderSuccess)).toHaveBeenCalled;
  });

  it('calls createDeploy with the checked out branch name', async () => {
    vi.mocked(getLatestGitCommit).mockResolvedValue({
      hash: '123',
      message: 'test commit',
      date: '2021-01-01',
      author_name: 'test author',
      author_email: 'test@author.com',
      body: 'test body',
      refs: 'HEAD -> main',
    });

    await oxygenDeploy(deployParams);

    expect(vi.mocked(createDeploy)).toHaveBeenCalledWith({
      config: {...expectedConfig, environmentTag: 'main'},
      hooks: expectedHooks,
      logger: deploymentLogger,
    });
    expect(vi.mocked(renderSuccess)).toHaveBeenCalled;
  });

  it('calls renderSelectPrompt when there are multiple environments', async () => {
    vi.mocked(getOxygenDeploymentData).mockResolvedValue({
      oxygenDeploymentToken: 'some-encoded-token',
      environments: [
        {name: 'production', branch: 'main'},
        {name: 'preview', branch: 'staging'},
      ],
    });

    await oxygenDeploy(deployParams);

    expect(vi.mocked(renderSelectPrompt)).toHaveBeenCalledWith({
      message: 'Select an environment to deploy to',
      choices: [
        {label: 'production', value: 'main'},
        {label: 'preview', value: 'staging'},
      ],
    });
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

  it('handles error during deployment verification', async () => {
    const mockRenderFatalError = vi.fn();
    vi.mocked(renderFatalError).mockImplementation(mockRenderFatalError);

    const error = new Error('Cloudflare is down!');

    vi.mocked(createDeploy).mockImplementation((options) => {
      options.hooks?.onUploadFilesStart?.();
      options.hooks?.onUploadFilesComplete?.();
      options.hooks?.onVerificationError?.(error);

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
