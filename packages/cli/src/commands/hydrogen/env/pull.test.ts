import {execFileSync} from 'node:child_process';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  fileExists,
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {readAndParseDotEnv} from '@shopify/cli-kit/node/dot-env';
import {isTTY, renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

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
    isTTY: vi.fn(),
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
    vi.mocked(isTTY).mockReturnValue(true);
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
    const mockVariables = (values: Record<string, string>) =>
      vi.mocked(getStorefrontEnvVariables).mockResolvedValue({
        id: SHOPIFY_CONFIG.storefront.id,
        environmentVariables: Object.entries(values).map(
          ([key, value], index) => ({
            id: `gid://shopify/HydrogenStorefrontEnvironmentVariable/${index}`,
            key,
            value,
            readOnly: false,
            isSecret: false,
          }),
        ),
      });

    // Values that must survive `env pull` unchanged when read back by the
    // dotenv parser used by `hydrogen dev`, `env push` and `deploy`.
    const ROUND_TRIP_VALUES: Record<string, string> = {
      SIMPLE: 'abc123',
      BRACES_AND_AT: 'IirR{L3T#udhJ@gqKPN}Ne@sLuez73X)',
      DOLLAR: 'pa$word',
      DOLLAR_BRACE: 'x${HOME}y',
      COMMAND_SUBSTITUTION: '$(touch pwned-dollar)',
      BACKTICK: '`touch pwned-backtick`',
      BACKSLASH: 'a\\b',
      DOUBLE_QUOTES: 'value"with"quotes',
      SINGLE_QUOTE: "it's",
      HASH: 'a#b',
      SPACES: '  padded value  ',
      TAB: 'a\tb',
      CONTROL_CHARS: 'value\u0000\u001B[31mevil',
      BACKSLASH_INJECTION: 'value\\"; rm -rf /',
      NEWLINE: 'value\necho hacked',
      CRLF: 'line1\r\nline2',
      MULTILINE_KEY:
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA04up8hoqzS1...\n-----END RSA PRIVATE KEY-----',
      TABS_AND_RETURNS: 'line1\tcolumn2\rreturn\nline2',
      MULTILINE_QUOTES_AND_HASH:
        'snapshot test # "quoted" $literal\\path\nsecond line',
    };

    beforeEach(() => {
      vi.mocked(renderConfirmationPrompt).mockResolvedValue(true);
    });

    it('writes values that dotenv parses back unchanged', async () => {
      mockVariables(ROUND_TRIP_VALUES);

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        const {variables} = await readAndParseDotEnv(filePath);
        expect(variables).toEqual(ROUND_TRIP_VALUES);
      });
    });

    it.each([
      'private-value \' " ` #\r',
      "it's $5",
      'it\'s "quoted" # literal',
      "it's a literal \\n, not a newline",
      'touch pwned; echo "\'"',
      "it's $(touch pwned)",
      "it's `touch pwned`",
    ])('rejects unsafe or unsupported quoting (%#)', async (value) => {
      mockVariables({KEY: value});
      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(filePath, 'LOCAL_ONLY=keep-me');
        await expect(runEnvPull({path: tmpDir, envFile})).rejects.toThrow(
          'An environment variable cannot be represented in dotenv format without changing its value.',
        );
        expect(await readFile(filePath)).toBe('LOCAL_ONLY=keep-me');
        if (process.platform !== 'win32') {
          execFileSync('sh', ['-c', `set -a; . ./${envFile}`], {cwd: tmpDir});
          expect(await fileExists(joinPath(tmpDir, 'pwned'))).toBe(false);
        }
      });
    });

    it('does not quote simple alphanumeric values for backward compatibility', async () => {
      mockVariables({SIMPLE_VALUE: 'abc123'});

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        expect(await readFile(filePath)).toBe('SIMPLE_VALUE=abc123');
      });
    });

    it('uses single quotes so values are literal', async () => {
      mockVariables({
        COMPLEX: 'val{ue}@test',
        DOLLAR: 'pa$word',
        BACKTICK: '`id`',
        BACKSLASH: 'a\\b',
        DOUBLE_QUOTES: 'say "hi"',
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        const content = await readFile(filePath);
        expect(content).toContain("COMPLEX='val{ue}@test'");
        expect(content).toContain("DOLLAR='pa$word'");
        expect(content).toContain("BACKTICK='`id`'");
        expect(content).toContain("BACKSLASH='a\\b'");
        expect(content).toContain(`DOUBLE_QUOTES='say "hi"'`);
      });
    });

    it('uses double quotes with escaped line breaks when single quotes cannot be used', async () => {
      mockVariables({
        SINGLE_QUOTE: "it's",
        MULTILINE: 'line1\nline2\r\nline3',
      });

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);

        await runEnvPull({path: tmpDir, envFile});

        const content = await readFile(filePath);
        expect(content).toContain(`SINGLE_QUOTE="it's"`);
        expect(content).toContain('MULTILINE="line1\\nline2\\r\\nline3"');
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

    it('round-trips values when patching an existing .env file', async () => {
      mockVariables(ROUND_TRIP_VALUES);

      await inTemporaryDirectory(async (tmpDir) => {
        const filePath = joinPath(tmpDir, envFile);
        await writeFile(
          filePath,
          [
            '# local overrides',
            'LOCAL_ONLY=keep-me',
            'DOLLAR="stale"',
            'LOCAL_MULTILINE="first',
            'second"',
          ].join('\n'),
        );

        await runEnvPull({path: tmpDir, envFile});
        const contentAfterFirstPull = await readFile(filePath);
        expect(contentAfterFirstPull).toContain('# local overrides');

        // Pulling again should be a no-op: no prompt and no rewrite
        vi.mocked(renderConfirmationPrompt).mockClear();
        const outputMock = mockAndCaptureOutput();
        outputMock.clear();

        await runEnvPull({path: tmpDir, envFile});

        expect(renderConfirmationPrompt).not.toHaveBeenCalled();
        expect(outputMock.info()).toMatch(/No changes to your/);
        expect(await readFile(filePath)).toBe(contentAfterFirstPull);

        const {variables} = await readAndParseDotEnv(filePath);
        expect(variables).toEqual({
          ...ROUND_TRIP_VALUES,
          LOCAL_ONLY: 'keep-me',
          LOCAL_MULTILINE: 'first\nsecond',
        });
      });
    });

    it.skipIf(process.platform === 'win32')(
      'does not execute single-quoted values when the file is shell-sourced',
      async () => {
        const shellSafeValues = Object.fromEntries(
          Object.entries(ROUND_TRIP_VALUES).filter(
            ([, value]) => !/['\r\n]/.test(value) && !value.includes('\u0000'),
          ),
        );
        mockVariables(shellSafeValues);

        await inTemporaryDirectory(async (tmpDir) => {
          const filePath = joinPath(tmpDir, envFile);

          await runEnvPull({path: tmpDir, envFile});

          const output = execFileSync(
            'sh',
            ['-c', `set -a; . ./${envFile}; env -0`],
            {cwd: tmpDir, env: {PATH: process.env.PATH}},
          ).toString();
          const sourced = Object.fromEntries(
            output
              .split('\0')
              .filter(Boolean)
              .map((entry) => {
                const index = entry.indexOf('=');
                return [entry.slice(0, index), entry.slice(index + 1)];
              }),
          );

          for (const [key, value] of Object.entries(shellSafeValues)) {
            expect(sourced[key]).toBe(value);
          }
          expect(await fileExists(joinPath(tmpDir, 'pwned-dollar'))).toBe(
            false,
          );
          expect(await fileExists(joinPath(tmpDir, 'pwned-backtick'))).toBe(
            false,
          );
        });
      },
    );
  });
});
