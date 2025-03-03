import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {platform, userInfo} from 'node:os';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {getPackageManager} from '@shopify/cli-kit/node/node-package-manager';
import {
  getCliCommand,
  shellWriteAlias,
  createPlatformShortcut,
} from './shell.js';
import {execAsync} from './process.js';

vi.mock('node:os');
vi.mock('node:child_process');
vi.mock('@shopify/cli-kit/node/fs');
vi.mock('@shopify/cli-kit/node/node-package-manager');
vi.mock('./process.js', async () => {
  const original =
    await vi.importActual<typeof import('./process.js')>('./process.js');

  return {
    ...original,
    execAsync: vi.fn(),
  };
});

vi.mocked(fileExists).mockResolvedValue(false);
vi.mocked(getPackageManager).mockResolvedValue('npm');

describe('shell', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.MINGW_PREFIX;
  });

  describe('shellWriteAlias', () => {
    (['bash', 'zsh', 'fish'] as const).forEach((shell) => {
      const alias = 'h2';
      const command = 'command';

      it(`writes ${shell} alias to file`, async () => {
        await expect(
          shellWriteAlias(shell, alias, command),
        ).resolves.toBeTruthy();

        expect(execAsync).toHaveBeenLastCalledWith(
          expect.stringMatching(
            new RegExp(
              `printf "${command}" ${
                shell === 'fish' ? '>' : '>>'
              } .*\.${shell}`,
            ),
          ),
        );
      });

      it(`skips writing ${shell} alias when not supported`, async () => {
        vi.mocked(execAsync).mockImplementation((shellCommand) =>
          shellCommand.startsWith('which')
            ? Promise.reject(null)
            : (Promise.resolve({stdout: 'stuff', stderr: ''}) as any),
        );

        await expect(
          shellWriteAlias(shell, alias, command),
        ).resolves.toBeFalsy();

        expect(execAsync).not.toHaveBeenLastCalledWith(
          expect.stringMatching(/^printf/),
        );
      });

      it(`skips writing ${shell} alias when already aliased`, async () => {
        vi.mocked(fileExists).mockResolvedValue(true);
        vi.mocked(execAsync).mockImplementation((shellCommand) =>
          shellCommand.startsWith('which') || shellCommand.startsWith('grep')
            ? (Promise.resolve({stdout: 'stuff', stderr: ''}) as any)
            : Promise.reject(null),
        );

        await expect(
          shellWriteAlias(shell, alias, command),
        ).resolves.toBeTruthy();

        expect(execAsync).not.toHaveBeenLastCalledWith(
          expect.stringMatching(/^printf/),
        );
      });
    });
  });

  describe('createPlatformShortcut', () => {
    it('creates aliases for Unix', async () => {
      // Given
      vi.mocked(platform).mockReturnValue('darwin');

      // When
      const result = await createPlatformShortcut();

      // Then
      expect(result).toEqual(expect.arrayContaining(['zsh', 'bash', 'fish']));
    });

    it('creates aliases for Windows', async () => {
      // Given
      vi.mocked(platform).mockReturnValue('win32');

      // When
      const result = await createPlatformShortcut();

      // Then
      expect(result).toEqual(
        expect.arrayContaining(['PowerShell', 'PowerShell 7+']),
      );
    });

    it('creates aliases for Windows in Git Bash', async () => {
      // Given
      process.env.MINGW_PREFIX = 'something';
      vi.mocked(platform).mockReturnValue('win32');

      // When
      const result = await createPlatformShortcut();

      // Then
      expect(result).toEqual(expect.arrayContaining(['bash']));
    });
  });

  describe('getCliCommand', () => {
    it('returns the shortcut alias if available', async () => {
      vi.mocked(userInfo).mockReturnValue({shell: '/bin/bash'} as any);
      vi.mocked(execAsync).mockImplementation((shellCommand) =>
        shellCommand.startsWith('grep')
          ? (Promise.resolve({stdout: 'stuff', stderr: ''}) as any)
          : Promise.reject(null),
      );

      await expect(getCliCommand()).resolves.toEqual('h2');
    });

    it('returns the used package manager command', async () => {
      vi.mocked(execAsync).mockImplementation(() => Promise.reject(null));

      // No package manager found
      vi.mocked(getPackageManager).mockRejectedValueOnce(null);
      await expect(getCliCommand()).resolves.toEqual('npx shopify hydrogen');

      // NPM
      vi.mocked(getPackageManager).mockResolvedValue('npm');
      await expect(getCliCommand()).resolves.toEqual('npx shopify hydrogen');

      // Yarn
      vi.mocked(getPackageManager).mockResolvedValue('yarn');
      await expect(getCliCommand()).resolves.toEqual('yarn shopify hydrogen');

      // Pnpm
      vi.mocked(getPackageManager).mockResolvedValue('pnpm');
      await expect(getCliCommand()).resolves.toEqual('pnpm shopify hydrogen');
    });
  });
});
