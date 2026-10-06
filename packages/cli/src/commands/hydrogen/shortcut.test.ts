import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {runCreateShortcut} from './shortcut.js';
import {handler} from '@shopify/cli-kit/node/error';
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

  it('reports an error when not finding shells', async () => {
    // Given
    vi.mocked(createPlatformShortcut).mockResolvedValue([]);

    // When
    await runCreateShortcut().catch(handler);

    // Then
    expect(outputMock.info()).toBeFalsy();
    expect(outputMock.error()).toBeTruthy();
  });
});
