import {expect, it, vi} from 'vitest';
import {graphqlRequest} from '@shopify/cli-kit/node/api/graphql';
import {replaceCustomerApplicationUrls} from './customer-application-update.js';

vi.mock('@shopify/cli-kit/node/api/graphql');

it('cancels a pending Customer Account mutation through the Admin client', async () => {
  const controller = new AbortController();
  let requestSignal: AbortSignal | undefined;
  vi.mocked(graphqlRequest).mockImplementation(async ({preferredBehaviour}) => {
    if (
      typeof preferredBehaviour === 'object' &&
      typeof preferredBehaviour.useAbortSignal === 'function'
    ) {
      requestSignal = preferredBehaviour.useAbortSignal() as AbortSignal;
    }
    return new Promise(() => {});
  });
  const running = replaceCustomerApplicationUrls(
    {token: '', storeFqdn: 'example.myshopify.com'},
    'gid://shopify/HydrogenStorefront/1',
    {javascriptOrigin: {add: ['https://example.tryhydrogen.dev']}},
    controller.signal,
  );
  await vi.waitFor(() => expect(requestSignal).toBeDefined());
  controller.abort();
  await expect(running).rejects.toBe(controller.signal.reason);
  expect(requestSignal?.aborted).toBe(true);
});
