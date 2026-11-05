import {afterEach, expect, it, vi} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {captureJsonOutput} from '../../../tests/output.js';
import {createAbortHandler} from './common.js';

afterEach(() => vi.restoreAllMocks());

it('emits one fatal JSON error and exits after aborting initialization', async () => {
  const stopped = new Error('process exited');
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw stopped;
  });
  const controller = new AbortController();
  const abort = createAbortHandler(controller);
  const {stdout, stderr} = await captureJsonOutput(async () => {
    await expect(
      abort(new AbortError('Template download failed', 'Try again.')),
    ).rejects.toBe(stopped);
  });
  expect(JSON.parse(stdout)).toEqual({
    error: {
      type: 'abort',
      message: 'Failed to initialize project: Template download failed',
      tryMessage: 'Try again.',
    },
  });
  expect(stderr).toBe('');
  expect(controller.signal.aborted).toBe(true);
  expect(exit).toHaveBeenCalledExactlyOnceWith(1);
});
