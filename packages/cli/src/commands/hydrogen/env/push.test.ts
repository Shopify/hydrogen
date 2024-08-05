import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {
  renderConfirmationPrompt,
  renderSelectPrompt,
} from '@shopify/cli-kit/node/ui';

import {type AdminSession, login} from '../../../lib/auth.js';
import {getStorefrontEnvVariables} from '../../../lib/graphql/admin/pull-variables.js';
import {getStorefrontEnvironments} from '../../../lib/graphql/admin/list-environments.js';
import {pushStorefrontEnvVariables} from '../../../lib/graphql/admin/push-variables.js';
import {dummyListEnvironments} from '../../../lib/graphql/admin/test-helper.js';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';

import {runEnvPush} from './push.js';
import {AbortError} from '@shopify/cli-kit/node/error';

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');
  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
    renderSelectPrompt: vi.fn(),
  };
});
vi.mock('../link.js');
vi.mock('../../../lib/auth.js');
vi.mock('../../../lib/render-errors.js');
vi.mock('../../../lib/graphql/admin/pull-variables.js');
vi.mock('../../../lib/graphql/admin/list-environments.js');
vi.mock('../../../lib/verify-linked-storefront.js');
vi.mock('../../../lib/graphql/admin/push-variables.js');

const envFile = '.env';

const ADMIN_SESSION: AdminSession = {
  token: 'abc123',
  storeFqdn: 'my-shop',
};

const SHOPIFY_CONFIG = {
  shop: 'my-shop',
  shopName: 'My Shop',
  email: 'email',
  storefront: {
    id: 'gid://shopify/HydrogenStorefront/2',
    title: 'Existing Link',
  },
};

const storefrontWithEnvironments = dummyListEnvironments(
  SHOPIFY_CONFIG.storefront.id,
);

const outputMock = mockAndCaptureOutput();
const processExit = vi.spyOn(process, 'exit');

describe('pushVariables', () => {
  beforeEach(async () => {
    processExit.mockImplementation((() => {
      throw 'mockExit';
    }) as any);

    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });

    vi.mocked(verifyLinkedStorefront).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      title: SHOPIFY_CONFIG.storefront.title,
      productionUrl: 'https://my-shop.myshopify.com',
    });

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
          key: 'PUBLIC_API_TOKEN',
          value: 'abc123',
          readOnly: true,
          isSecret: false,
        },
        {
          id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/2',
          key: 'PRIVATE_API_TOKEN',
          value: '',
          readOnly: true,
          isSecret: true,
        },
      ],
    });

    vi.mocked(getStorefrontEnvironments).mockResolvedValue(
      storefrontWithEnvironments,
    );

    vi.mocked(pushStorefrontEnvVariables).mockResolvedValue({
      userErrors: [],
    });
  });

  afterEach(() => {
    outputMock.clear();
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it('calls getStorefrontEnvironments', async () => {
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');

      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();

      expect(getStorefrontEnvironments).toHaveBeenCalledWith(
        ADMIN_SESSION,
        SHOPIFY_CONFIG.storefront.id,
      );
    });
  });

  it('errors if no environments data', async () => {
    vi.mocked(getStorefrontEnvironments).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      productionUrl: 'prod.com',
      environments: [],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).rejects.toThrowError('No environments found');
    });
  });

  it('prompts the user to select an environment', async () => {
    vi.mocked(renderSelectPrompt).mockResolvedValue(
      storefrontWithEnvironments.environments[0]!.id,
    );

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(runEnvPush({path: tmpDir, envFile})).resolves.not.toThrow();

      expect(renderSelectPrompt).toHaveBeenCalledWith({
        message:
          'Select an environment to overwrite its environment variables:',
        choices: [
          expect.objectContaining({label: expect.stringContaining('Preview')}),
          expect.objectContaining({label: expect.stringContaining('Staging')}),
          expect.objectContaining({
            label: expect.stringContaining('Production'),
          }),
        ],
      });
    });
  });

  describe('when env is passed', () => {
    it('errors when the environment does not match graphql', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
        await expect(
          runEnvPush({path: tmpDir, env: 'something-random', envFile}),
        ).rejects.toThrowError('Environment not found');
      });
    });

    it("ensures getStorefrontEnvVariables is called with environment's handle", async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
        await expect(
          runEnvPush({path: tmpDir, env: 'production', envFile}),
        ).resolves.not.toThrow();

        await expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
          ADMIN_SESSION,
          SHOPIFY_CONFIG.storefront.id,
          'production',
        );
      });
    });
  });

  describe('how environment file path is resolved', () => {
    it('uses the .env file in the current path', async () => {
      const filePath = joinPath(process.cwd(), envFile);
      await writeFile(filePath, 'NEW_TOKEN_1=1\nNEW_TOKEN_2=2');

      await expect(
        runEnvPush({env: 'production', envFile}),
      ).resolves.not.toThrow();
    });

    it('uses the .env file in the provided path', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'NEW_TOKEN_1=1\nNEW_TOKEN_2=2');

        await expect(
          runEnvPush({path: tmpDir, env: 'production', envFile}),
        ).resolves.not.toThrow();
      });
    });

    it('uses the .env file provided by the `--env-file` flag', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'NEW_TOKEN_1=1\nNEW_TOKEN_2=2');

        await expect(
          runEnvPush({envFile: filePath, env: 'production'}),
        ).resolves.not.toThrow();
      });
    });

    it('throws an error if the .env file does not exist', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, 'fake-file.env');

        await expect(
          runEnvPush({envFile: filePath, env: 'production'}),
        ).rejects.toThrow(AbortError);
      });
    });
  });

  describe('when there is no linked storefront', () => {
    beforeEach(() => {
      vi.mocked(verifyLinkedStorefront).mockResolvedValue(undefined);
    });

    it("doesn't fetch environment info to push env vars", async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'NEW_TOKEN_1=1\nNEW_TOKEN_2=2');

        await expect(
          runEnvPush({path: tmpDir, env: 'production', envFile}),
        ).resolves.not.toThrow();

        expect(getStorefrontEnvironments).not.toHaveBeenCalled();
      });
    });
  });

  it('exits if variables are identical', async () => {
    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'EXISTING_TOKEN',
          value: '1',
          isSecret: false,
          readOnly: false,
        },
        {
          id: '2',
          key: 'SECOND_TOKEN',
          value: '2',
          isSecret: false,
          readOnly: false,
        },
      ],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();

      expect(outputMock.info()).toMatch(
        /No changes to your environment variables/,
      );
    });
  });

  it('renders a diff when a variable is updated', async () => {
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'EXISTING_TOKEN',
          value: '1',
          isSecret: false,
          readOnly: false,
        },
        {
          id: '2',
          key: 'SECOND_TOKEN',
          value: 'updated value',
          isSecret: false,
          readOnly: false,
        },
      ],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();

      expect(renderConfirmationPrompt).toHaveBeenCalled();
    });
  });

  it('ignores comparison against secrets', async () => {
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'EXISTING_TOKEN',
          value: '1',
          isSecret: false,
          readOnly: false,
        },
        {
          id: '2',
          key: 'SECOND_TOKEN',
          value: 'updated value',
          isSecret: true,
          readOnly: false,
        },
      ],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();
    });

    expect(outputMock.info()).toMatch(
      /No changes to your environment variables/,
    );
  });

  it('ignores comparison against read only variables', async () => {
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'EXISTING_TOKEN',
          value: '1',
          isSecret: false,
          readOnly: false,
        },
        {
          id: '2',
          key: 'SECOND_TOKEN',
          value: 'updated value',
          isSecret: false,
          readOnly: true,
        },
      ],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();

      expect(outputMock.info()).toMatch(
        /No changes to your environment variables/,
      );
    });
  });

  it('exits when diff is not confirmed', async () => {
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'EXISTING_TOKEN',
          value: '1',
          isSecret: false,
          readOnly: false,
        },
        {
          id: '2',
          key: 'SECOND_TOKEN',
          value: 'updated value',
          isSecret: false,
          readOnly: true,
        },
      ],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=2');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();

      expect(pushStorefrontEnvVariables).not.toHaveBeenCalled();
    });
  });

  it('calls pushStorefrontEnvVariables when diff is confirmed', async () => {
    vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

    vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
      id: SHOPIFY_CONFIG.storefront.id,
      environmentVariables: [
        {
          id: '1',
          key: 'EXISTING_TOKEN',
          value: '1',
          isSecret: false,
          readOnly: false,
        },
        {
          id: '2',
          key: 'SECOND_TOKEN',
          value: '2',
          isSecret: false,
          readOnly: false,
        },
      ],
    });

    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);
      await writeFile(filePath, 'EXISTING_TOKEN=1\nSECOND_TOKEN=NEW_VALUE');
      await expect(
        runEnvPush({path: tmpDir, env: 'preview', envFile}),
      ).resolves.not.toThrow();

      expect(pushStorefrontEnvVariables).toHaveBeenCalledWith(
        {storeFqdn: 'my-shop', token: 'abc123'},
        'gid://shopify/HydrogenStorefront/2',
        'gid://shopify/HydrogenStorefrontEnvironment/2',
        [
          {key: 'EXISTING_TOKEN', value: '1'},
          {key: 'SECOND_TOKEN', value: 'NEW_VALUE'},
        ],
      );

      expect(outputMock.info()).toMatch(
        /Environment variables push to Preview was successful/,
      );
    });
  });
});
