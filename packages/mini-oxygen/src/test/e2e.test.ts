import {it, vi, describe, beforeEach, expect, afterEach} from 'vitest';

import {preview, MiniOxygenPreviewOptions} from '../preview';

import {createFixture, Fixture} from './utils';

describe('preview()', () => {
  let fixture: Fixture;
  const defaultOptions: MiniOxygenPreviewOptions = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    fixture = await createFixture('basic-fixture');
  });

  afterEach(async () => {
    await fixture.destroy();
  });

  it('displays a message when the server is running', async () => {
    const mockLogger = vi.fn();
    await preview({
      ...defaultOptions,
      log: mockLogger,
      port: fixture.port,
      workerFile: fixture.paths.workerFile,
    });

    expect(mockLogger).toHaveBeenCalledWith(
      `\nStarted miniOxygen server. Listening at http://localhost:${fixture.port}\n`,
    );
  });
});
