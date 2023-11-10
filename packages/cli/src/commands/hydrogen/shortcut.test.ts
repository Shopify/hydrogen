import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {runCreateShortcut} from './shortcut.js';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {createPlatformShortcut} from '../../lib/shell.js';

vi.mock('../../lib/shell.js');

describe('shortcut', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    outputMock.clear();
  });

  it('shows created aliases', async () => {
    // Given
    vi.mocked(createPlatformShortcut).mockResolvedValue([
      'zsh',
      'bash',
      'fish',
    ]);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toMatch(`zsh, bash, fish`);
  });

  it('warns when not finding shells', async () => {
    // Given
    vi.mocked(createPlatformShortcut).mockResolvedValue([]);

    // When
    await runCreateShortcut();

    // Then
    expect(outputMock.info()).toBeFalsy();
    expect(outputMock.error()).toBeTruthy();
  });
});
