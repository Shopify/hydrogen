import {describe, it, expect, vi, beforeEach} from 'vitest';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {shellWriteAlias} from './shell.js';
import {execAsync} from './process.js';

describe('shell', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('node:child_process');
    vi.mock('@shopify/cli-kit/node/fs');
    vi.mock('./process.js', async () => {
      const original = await vi.importActual<typeof import('./process.js')>(
        './process.js',
      );

      return {
        ...original,
        execAsync: vi.fn(),
      };
    });

    vi.mocked(fileExists).mockResolvedValue(false);
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
});
