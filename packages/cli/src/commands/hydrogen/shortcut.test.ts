import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import {runCreateShortcut} from './shortcut.js';
import {execSync} from 'child_process';
import {outputMocker} from '@shopify/cli-kit';

const originalPlatform = process.platform;

const mockExecSyncImplementation = (
  command: string,
  {shell}: {shell?: string} = {},
) => {
  if (command.startsWith('which')) {
    const item = command.split(' ')[1];
    if (process.platform === 'win32' && item !== 'bash') {
      throw new Error(`${item} not found`);
    }

    return Buffer.from('/usr/path/to/shell');
  }
  if (command.startsWith('grep')) {
    return Buffer.from('alias h2="hydrogen"');
  }

  if (command.startsWith('echo') || shell?.endsWith('.exe')) {
    return Buffer.from('');
  }

  throw new Error('Unknown command: ' + command);
};

describe('shortcut', () => {
  const outputMock = outputMocker.mockAndCaptureOutput();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock('child_process');
    vi.mocked(execSync).mockImplementation(mockExecSyncImplementation);
  });

  afterEach(() => {
    outputMock.clear();
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', {value: originalPlatform});
    delete process.env.MINGW_PREFIX;
  });

  it(`creates aliases for Unix`, async () => {
    // Given
    Object.defineProperty(process, 'platform', {value: 'linux'});

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch(`zsh, bash, fish`);
    expect(outputMock.error()).toBeFalsy();
  });

  it(`creates aliases for Windows`, async () => {
    // Given
    Object.defineProperty(process, 'platform', {value: 'win32'});

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch(`PowerShell, PowerShell 7+`);
    expect(outputMock.error()).toBeFalsy();
  });

  it(`creates aliases for Windows in Git Bash`, async () => {
    // Given
    Object.defineProperty(process, 'platform', {value: 'win32'});
    process.env.MINGW_PREFIX = 'C:\\Program Files\\Git';

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch('bash');
    expect(outputMock.error()).toBeFalsy();
  });

  it(`warns about not finding shells to alias`, async () => {
    // Given
    Object.defineProperty(process, 'platform', {value: 'darwin'});
    vi.mocked(execSync).mockImplementation((command: string) => {
      if (command.startsWith('which')) {
        const item = command.split(' ')[1];
        throw new Error(`${item} not found`);
      }

      return mockExecSyncImplementation(command);
    });

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toBeFalsy();
    expect(outputMock.error()).toBeTruthy();
  });
});
