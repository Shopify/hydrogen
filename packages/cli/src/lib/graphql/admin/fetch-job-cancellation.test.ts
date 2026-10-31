import {afterEach, expect, it, vi} from 'vitest';
import {adminRequest} from './client.js';
import {waitForJob} from './fetch-job.js';

vi.mock('./client.js');
afterEach(() => vi.resetAllMocks());
const session = {token: 'token', storeFqdn: 'example.myshopify.com'};

it('cancels the polling delay before sending a provisioning query', async () => {
  const controller = new AbortController();
  const running = waitForJob(session, 'job', controller.signal);
  controller.abort();
  await expect(running).rejects.toBe(controller.signal.reason);
  expect(adminRequest).not.toHaveBeenCalled();
});

it('cancels an in-flight provisioning query', async () => {
  vi.mocked(adminRequest).mockImplementation(
    (_query, _session, _variables, signal) =>
      new Promise((_resolve, reject) => {
        signal!.addEventListener('abort', () => reject(signal!.reason), {
          once: true,
        });
      }),
  );
  const controller = new AbortController();
  const running = waitForJob(session, 'job', controller.signal);
  const settled = running.catch(() => {});
  try {
    await vi.waitFor(() => expect(adminRequest).toHaveBeenCalledOnce());
    controller.abort();
    await expect(running).rejects.toBe(controller.signal.reason);
    expect(vi.mocked(adminRequest).mock.calls[0]![3]).toBe(controller.signal);
  } finally {
    controller.abort();
    await settled;
  }
});
