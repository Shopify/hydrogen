import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {runCreateShortcut} from './shortcut.js';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {isWindows, isGitBash, shellWriteAlias} from '../../lib/shell.js';
import {execSync, exec} from 'child_process';

describe('shortcut', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('child_process');
    vi.mock('../../lib/shell.js', async () => {
      const original = await vi.importActual<
        typeof import('../../lib/shell.js')
      >('../../lib/shell.js');

      return {
        ...original,
        isWindows: vi.fn(),
        isGitBash: vi.fn(),
        shellWriteAlias: vi.fn(),
        shellRunScript: async () => true,
      };
    });

    vi.mocked(shellWriteAlias).mockImplementation(
      async (shell: string) => !isWindows() || shell === 'bash',
    );
  });

  afterEach(() => {
    outputMock.clear();
    // Check we are mocking all the things:
    expect(execSync).toHaveBeenCalledTimes(0);
    expect(exec).toHaveBeenCalledTimes(0);
  });

  it('creates aliases for Unix', async () => {
    // Given
    vi.mocked(isWindows).mockReturnValue(false);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch(`zsh, bash, fish`);
    expect(outputMock.error()).toBeFalsy();
  });

  it('creates aliases for Windows', async () => {
    // Given
    vi.mocked(isWindows).mockReturnValue(true);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch(`PowerShell, PowerShell 7+`);
    expect(outputMock.error()).toBeFalsy();
  });

  it('creates aliases for Windows in Git Bash', async () => {
    // Given
    vi.mocked(isWindows).mockReturnValue(true);
    vi.mocked(isGitBash).mockReturnValueOnce(true);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch('bash');
    expect(outputMock.error()).toBeFalsy();
  });

  it('warns when not finding shells', async () => {
    // Given
    vi.mocked(isWindows).mockReturnValue(false);
    vi.mocked(shellWriteAlias).mockResolvedValue(false);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toBeFalsy();
    expect(outputMock.error()).toBeTruthy();
  });
});
