import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  fileExists,
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {type AdminSession, login} from '../../../lib/auth.js';
import {getStorefrontEnvVariables} from '../../../lib/graphql/admin/pull-variables.js';

import {runEnvPull} from './pull.js';
import {
  renderMissingLink,
  renderMissingStorefront,
} from '../../../lib/render-errors.js';
import {linkStorefront} from '../link.js';

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');
  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
  };
});
vi.mock('../link.js');
vi.mock('../../../lib/auth.js');
vi.mock('../../../lib/render-errors.js');
vi.mock('../../../lib/graphql/admin/pull-variables.js');

describe('pullVariables', () => {
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

  beforeEach(async () => {
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
        {
          id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/2',
          key: 'PRIVATE_API_TOKEN',
          value: '',
          isSecret: true,
        },
      ],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('calls getStorefrontEnvVariables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await runEnvPull({path: tmpDir, envBranch: 'staging'});

      expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
        ADMIN_SESSION,
        SHOPIFY_CONFIG.storefront.id,
        'staging',
      );
    });
  });

  it('writes environment variables to a .env file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, '.env');

      expect(await fileExists(filePath)).toBeFalsy();

      await runEnvPull({path: tmpDir});

      expect(await readFile(filePath)).toStrictEqual(
        'PUBLIC_API_TOKEN=abc123\n' + 'PRIVATE_API_TOKEN=""',
      );
    });
  });

  it('warns about secret environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await runEnvPull({path: tmpDir});

      expect(outputMock.warn()).toMatch(
        /Existing Link contains environment variables marked as secret, so their/,
      );
      expect(outputMock.warn()).toMatch(/values weren’t pulled./);
    });
  });

  it('renders a success message', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await runEnvPull({path: tmpDir});

      expect(outputMock.info()).toMatch(
        /Changes have been made to your \.env file/,
      );
    });
  });

  describe('when environment variables are empty', () => {
    beforeEach(() => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: 'gid://shopify/HydrogenStorefront/1',
        environmentVariables: [],
      });
    });

    it('renders a message', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const outputMock = mockAndCaptureOutput();

        await runEnvPull({path: tmpDir});

        expect(outputMock.info()).toMatch(/No environment variables found\./);
      });
    });
  });

  describe('when there is no linked storefront', () => {
    beforeEach(async () => {
      vi.mocked(login).mockResolvedValue({
        session: ADMIN_SESSION,
        config: {
          ...SHOPIFY_CONFIG,
          storefront: undefined,
        },
      });
    });

    it('calls renderMissingLink', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir});

        expect(renderMissingLink).toHaveBeenCalledOnce();
      });
    });

    it('prompts the user to create a link', async () => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);

      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          message: expect.stringMatching(/Run .* link.*\?/i),
        });

        expect(linkStorefront).toHaveBeenCalledWith(
          tmpDir,
          ADMIN_SESSION,
          {...SHOPIFY_CONFIG, storefront: undefined},
          expect.anything(),
        );
      });
    });

    it('ends without requesting variables', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir});

        expect(getStorefrontEnvVariables).not.toHaveBeenCalled();
      });
    });

    describe('and the user does not create a new link', () => {
      it('ends without requesting variables', async () => {
        vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);

        await inTemporaryDirectory(async (tmpDir) => {
          await runEnvPull({path: tmpDir});

          expect(getStorefrontEnvVariables).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('when there is no matching storefront in the shop', () => {
    beforeEach(() => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue(null);
    });

    it('renders missing storefronts message and ends', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir});

        expect(renderMissingStorefront).toHaveBeenCalledOnce();
      });
    });
  });

  describe('when a .env file already exists', () => {
    beforeEach(() => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);
    });

    it('prompts the user to confirm', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, '.env');
        await writeFile(filePath, 'EXISTING_TOKEN=1');

        await runEnvPull({path: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          confirmationMessage: `Yes, confirm changes`,
          cancellationMessage: `No, make changes later`,
          message: expect.stringMatching(
            /We'll make the following changes to your \.env file:/,
          ),
        });
      });
    });

    describe('and --force is enabled', () => {
      it('does not prompt the user to confirm', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, '.env');
          await writeFile(filePath, 'EXISTING_TOKEN=1');

          await runEnvPull({path: tmpDir, force: true});

          expect(renderConfirmationPrompt).not.toHaveBeenCalled();
        });
      });
    });
  });
});
