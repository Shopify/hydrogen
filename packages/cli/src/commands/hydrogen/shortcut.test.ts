import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {runCreateShortcut} from './shortcut.js';
import {outputMocker} from '@shopify/cli-kit';
import {isWindows, isGitBash, supportsShell} from '../../utils/shell.js';
import {execSync, exec} from 'child_process';

describe('shortcut', () => {
  const outputMock = outputMocker.mockAndCaptureOutput();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('child_process');
    vi.mock('../../utils/shell.js', async () => {
      return {
        isWindows: vi.fn(),
        isGitBash: vi.fn(),
        supportsShell: vi.fn(),
        shellWriteFile: () => true,
        shellRunScript: () => true,
        hasAlias: () => false,
        homeFileExists: () => Promise.resolve(true),
      };
    });

    vi.mocked(supportsShell).mockImplementation(
      (shell: string) => !isWindows() || shell === 'bash',
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
    vi.mocked(supportsShell).mockReturnValue(false);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toBeFalsy();
    expect(outputMock.error()).toBeTruthy();
  });
});
