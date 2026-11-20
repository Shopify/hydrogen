import {expect, it, vi} from 'vitest';
import {abandonOnAbort} from './abort.js';

it('does not start an operation after cancellation', async () => {
  const operation = vi.fn(async () => 'result');
  const reason = new Error('Cancelled');
  await expect(
    abandonOnAbort(operation, AbortSignal.abort(reason)),
  ).rejects.toBe(reason);
  expect(operation).not.toHaveBeenCalled();
});

it('stops waiting for a pending operation on cancellation', async () => {
  const controller = new AbortController();
  const operation = vi.fn(() => new Promise<string>(() => {}));
  const running = abandonOnAbort(operation, controller.signal);
  await vi.waitFor(() => expect(operation).toHaveBeenCalled());
  controller.abort();
  await expect(running).rejects.toBe(controller.signal.reason);
});

it('returns an operation result and removes its abort listener', async () => {
  const controller = new AbortController();
  const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
  try {
    await expect(
      abandonOnAbort(async () => 'result', controller.signal),
    ).resolves.toBe('result');
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  } finally {
    removeListener.mockRestore();
  }
});

it('propagates an operation failure', async () => {
  const error = new Error('Operation failed');
  await expect(
    abandonOnAbort(async () => {
      throw error;
    }, new AbortController().signal),
  ).rejects.toBe(error);
});
