import {afterEach, expect, it, vi} from 'vitest';
import {adminRequest} from './client.js';
import {waitForJob} from './fetch-job.js';

vi.mock('./client.js');
vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn().mockResolvedValue(undefined),
}));

const session = {token: 'test-token', storeFqdn: 'test.myshopify.com'};
afterEach(() => vi.resetAllMocks());

it('waits until storefront provisioning completes', async () => {
  vi.mocked(adminRequest)
    .mockResolvedValueOnce({hydrogenStorefrontJob: {done: false, errors: []}})
    .mockResolvedValueOnce({hydrogenStorefrontJob: {done: true, errors: []}});
  await expect(waitForJob(session, 'job')).resolves.toBeUndefined();
  expect(adminRequest).toHaveBeenCalledTimes(2);
});

it('includes server errors instead of rejecting without a reason', async () => {
  vi.mocked(adminRequest).mockResolvedValue({
    hydrogenStorefrontJob: {
      done: true,
      errors: [
        {code: 'NOT_CONFIGURED', message: 'Reinstall the Hydrogen app'},
        {code: 'TOKEN_FAILED'},
      ],
    },
  });
  await expect(waitForJob(session, 'job')).rejects.toThrow(
    'Reinstall the Hydrogen app, TOKEN_FAILED',
  );
  expect(adminRequest).toHaveBeenCalledTimes(1);
});

it('propagates request failures instead of leaving a polling promise pending', async () => {
  vi.mocked(adminRequest).mockRejectedValue(new Error('Network unavailable'));
  await expect(waitForJob(session, 'job')).rejects.toThrow(
    'Network unavailable',
  );
  expect(adminRequest).toHaveBeenCalledTimes(1);
});
