import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  fileExists,
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

import {getAdminSession} from '../../../lib/admin-session.js';
import {pullRemoteEnvironmentVariables} from '../../../lib/pull-environment-variables.js';
import {getConfig} from '../../../lib/shopify-config.js';

import {pullVariables} from './pull.js';

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
vi.mock('../../../lib/admin-session.js');
vi.mock('../../../lib/shopify-config.js');
vi.mock('../../../lib/pull-environment-variables.js');
vi.mock('../../../lib/shop.js', () => ({
  getHydrogenShop: () => 'my-shop',
}));

describe('pullVariables', () => {
  const ADMIN_SESSION: AdminSession = {
    token: 'abc123',
    storeFqdn: 'my-shop',
  };

  beforeEach(async () => {
    vi.mocked(getAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(getConfig).mockResolvedValue({
      storefront: {
        id: 'gid://shopify/HydrogenStorefront/2',
        title: 'Existing Link',
      },
    });
    vi.mocked(pullRemoteEnvironmentVariables).mockResolvedValue([
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
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAndCaptureOutput().clear();
  });

  it('calls pullRemoteEnvironmentVariables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await pullVariables({path: tmpDir, envBranch: 'staging'});

      expect(pullRemoteEnvironmentVariables).toHaveBeenCalledWith({
        root: tmpDir,
        envBranch: 'staging',
      });
    });
  });

  it('writes environment variables to a .env file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const filePath = joinPath(tmpDir, '.env');

      expect(await fileExists(filePath)).toBeFalsy();

      await pullVariables({path: tmpDir});

      expect(await readFile(filePath)).toStrictEqual(
        'PUBLIC_API_TOKEN="abc123"\n' +
          '# PRIVATE_API_TOKEN is marked as secret and its value is hidden\n' +
          'PRIVATE_API_TOKEN=""\n',
      );
    });
  });

  it('warns about secret environment variables', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const outputMock = mockAndCaptureOutput();

      await pullVariables({path: tmpDir});

      expect(outputMock.warn()).toStrictEqual(
        'Existing Link contains environment variables marked as ' +
          'secret, so their values weren’t pulled.',
      );
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

        await pullVariables({path: tmpDir});

        expect(renderConfirmationPrompt).toHaveBeenCalledWith({
          message: expect.stringMatching(
            /Warning: \.env file already exists\. Do you want to overwrite it\?/,
          ),
        });
      });
    });

    describe('and --force is enabled', () => {
      it('does not prompt the user to confirm', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, '.env');
          await writeFile(filePath, 'EXISTING_TOKEN=1');

          await pullVariables({path: tmpDir, force: true});

          expect(renderConfirmationPrompt).not.toHaveBeenCalled();
        });
      });
    });
  });
});
