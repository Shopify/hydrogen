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
import {getStorefrontEnvironments} from '../../../lib/graphql/admin/list-environments.js';
import {getStorefrontEnvVariables} from '../../../lib/graphql/admin/pull-variables.js';
import {dummyListEnvironments} from '../../../lib/graphql/admin/test-helper.js';

import {runEnvPull} from './pull.js';
import {renderMissingStorefront} from '../../../lib/render-errors.js';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';

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
vi.mock('../../../lib/graphql/admin/list-environments.js');
vi.mock('../../../lib/verify-linked-storefront.js');
vi.mock('../../../lib/graphql/admin/pull-variables.js');

describe('pullVariables', () => {
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

  beforeEach(async () => {
    vi.mocked(login).mockResolvedValue({
      session: ADMIN_SESSION,
      config: SHOPIFY_CONFIG,
    });

    vi.mocked(getStorefrontEnvironments).mockResolvedValue(
      dummyListEnvironments(SHOPIFY_CONFIG.storefront.id),
    );

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
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  describe('when environment is provided', () => {
    it('calls getStorefrontEnvVariables when handle is provided', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir, env: 'staging', envFile});

        expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
          ADMIN_SESSION,
          SHOPIFY_CONFIG.storefront.id,
          'staging',
        );
      });
    });

    it('calls getStorefrontEnvVariables when branch is provided', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir, envBranch: 'main', envFile});

        expect(getStorefrontEnvVariables).toHaveBeenCalledWith(
          ADMIN_SESSION,
          SHOPIFY_CONFIG.storefront.id,
          'production',
        );
      });
    });

    it('throws error if handle does not map to any environment', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await expect(
          runEnvPull({path: tmpDir, env: 'fake', envFile}),
        ).rejects.toThrowError('Environment not found');
      });
    });

    it('throws error if branch does not map to any environment', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await expect(
          runEnvPull({path: tmpDir, envBranch: 'fake', envFile}),
        ).rejects.toThrowError('Environment not found');
      });
    });
  });

  it('writes environment variables to a .env file by default', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, envFile);

      expect(await fileExists(filePath)).toBeFalsy();

      await runEnvPull({path: tmpDir, envFile});

      expect(await readFile(filePath)).toStrictEqual(
        'PUBLIC_API_TOKEN=abc123\n' + 'PRIVATE_API_TOKEN=""',
      );
    });
  });

  it('writes environment variables to a specified file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, '.env.test');

      expect(await fileExists(filePath)).toBeFalsy();

      await runEnvPull({path: tmpDir, envFile: '.env.test'});

      expect(await readFile(filePath)).toStrictEqual(
        'PUBLIC_API_TOKEN=abc123\n' + 'PRIVATE_API_TOKEN=""',
      );
    });
  });

  it('warns about secret environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await runEnvPull({path: tmpDir, envFile});

      expect(outputMock.warn()).toMatch(
        /Existing Link contains environment variables marked as secret, so their/,
      );
      expect(outputMock.warn()).toMatch(/values weren’t pulled./);
    });
  });

  it('renders a success message', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await runEnvPull({path: tmpDir, envFile});

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

        await runEnvPull({path: tmpDir, envFile});

        expect(outputMock.info()).toMatch(/No environment variables found\./);
      });
    });
  });

  describe('when there is no linked storefront', () => {
    beforeEach(async () => {
      vi.mocked(verifyLinkedStorefront).mockResolvedValue(undefined);
    });

    it('ends without requesting variables', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runEnvPull({path: tmpDir, envFile});

        expect(getStorefrontEnvVariables).not.toHaveBeenCalled();
      });
    });

    describe('and the user does not create a new link', () => {
      it('ends without requesting variables', async () => {
        vi.mocked(renderConfirmationPrompt).mockResolvedValue(false);

        await inTemporaryDirectory(async (tmpDir) => {
          await runEnvPull({path: tmpDir, envFile});

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
        await runEnvPull({path: tmpDir, envFile});

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
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'EXISTING_TOKEN=1');

        await runEnvPull({path: tmpDir, envFile});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          confirmationMessage: `Yes, confirm changes`,
          cancellationMessage: `No, make changes later`,
          message: expect.stringMatching(
            /We'll make the following changes to your .*?\.env.*? file:/,
          ),
        });
      });
    });

    describe('and --force is enabled', () => {
      it('does not prompt the user to confirm', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, envFile);
          await writeFile(filePath, 'EXISTING_TOKEN=1');

          await runEnvPull({path: tmpDir, force: true, envFile});

          expect(renderConfirmationPrompt).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('environment variable quoting', () => {
    beforeEach(() => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);
    });

    it('quotes environment variables with shell metacharacters', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'ORDERGROOVE_HASH',
            value: 'IirR{L3T#udhJ@gqKPN}Ne@sLuez73X)',
            readOnly: false,
            isSecret: false,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        expect(await readFile(filePath)).toContain(
          'ORDERGROOVE_HASH="IirR{L3T#udhJ@gqKPN}Ne@sLuez73X)"',
        );
      });
    });

    it('does not quote simple alphanumeric values for backward compatibility', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'SIMPLE_VALUE',
            value: 'abc123',
            readOnly: false,
            isSecret: false,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        expect(await readFile(filePath)).toContain('SIMPLE_VALUE=abc123');
        expect(await readFile(filePath)).not.toContain('SIMPLE_VALUE="abc123"');
      });
    });

    it('escapes internal quotes in values', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'QUOTED_VALUE',
            value: 'value"with"quotes',
            readOnly: false,
            isSecret: false,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        expect(await readFile(filePath)).toContain(
          'QUOTED_VALUE="value\\"with\\"quotes"',
        );
      });
    });

    it('maintains secret variable behavior with quoting logic', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'SECRET_WITH_SPECIAL',
            value: 'secret{value}@test',
            readOnly: false,
            isSecret: true,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        expect(await readFile(filePath)).toContain('SECRET_WITH_SPECIAL=""');
        expect(await readFile(filePath)).not.toContain('secret{value}@test');
      });
    });

    it('handles mixed simple and complex values correctly', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'SIMPLE',
            value: 'abc123',
            readOnly: false,
            isSecret: false,
          },
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/2',
            key: 'COMPLEX',
            value: 'val{ue}@test',
            readOnly: false,
            isSecret: false,
          },
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/3',
            key: 'SECRET',
            value: 'anything',
            readOnly: false,
            isSecret: true,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        const content = await readFile(filePath);
        expect(content).toContain('SIMPLE=abc123');
        expect(content).toContain('COMPLEX="val{ue}@test"');
        expect(content).toContain('SECRET=""');
      });
    });

    it('handles potentially malicious values safely', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'BACKSLASH_INJECTION',
            value: 'value\\"; rm -rf /',
            readOnly: false,
            isSecret: false,
          },
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/2',
            key: 'CONTROL_CHARS',
            value: 'value\u0000\u001B[31mevil',
            readOnly: false,
            isSecret: false,
          },
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/3',
            key: 'NEWLINE_INJECTION',
            value: 'value\necho hacked',
            readOnly: false,
            isSecret: false,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        const content = await readFile(filePath);

        // Verify malicious values are properly quoted and escaped to prevent injection
        expect(content).toContain(
          'BACKSLASH_INJECTION="value\\\\\\"; rm -rf /"',
        );
        expect(content).toContain('CONTROL_CHARS="value\u0000\u001B[31mevil"');
        expect(content).toContain('NEWLINE_INJECTION="value\\necho hacked"');
      });
    });

    it('escapes special characters following dotenv standards', async () => {
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: [
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/1',
            key: 'MULTILINE_KEY',
            value:
              '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA04up8hoqzS1...\n-----END RSA PRIVATE KEY-----',
            readOnly: false,
            isSecret: false,
          },
          {
            id: 'gid://shopify/HydrogenStorefrontEnvironmentVariable/2',
            key: 'TABS_AND_RETURNS',
            value: 'line1\tcolumn2\rreturn\nline2',
            readOnly: false,
            isSecret: false,
          },
        ],
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        const content = await readFile(filePath);

        // Verify dotenv-compatible escaping
        expect(content).toContain(
          'MULTILINE_KEY="-----BEGIN RSA PRIVATE KEY-----\\nMIIEpAIBAAKCAQEA04up8hoqzS1...\\n-----END RSA PRIVATE KEY-----"',
        );
        expect(content).toContain(
          'TABS_AND_RETURNS="line1\\tcolumn2\\rreturn\\nline2"',
        );
      });
    });
  });
});
