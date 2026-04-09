import {vi, describe, it, expect, beforeEach} from 'vitest';
import {createRequestHandler} from './createRequestHandler.js';

const mockReactRouterHandler =
  vi.fn<(request: Request, context: any) => Promise<Response>>();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    createRequestHandler: () => mockReactRouterHandler,
  };
});

function createMockStorefront({
  isStorefrontApiUrl = (() => false) as (req: Request) => boolean,
  forward = () => Promise.resolve(new Response('forwarded')),
  setCollectedSubrequestHeaders = () => {},
} = {}) {
  return {isStorefrontApiUrl, forward, setCollectedSubrequestHeaders};
}

function createDocumentRequest(url = 'https://store.test/') {
  return new Request(url, {
    headers: {'sec-fetch-dest': 'document', accept: 'text/html'},
  });
}

describe('createRequestHandler', () => {
  beforeEach(() => {
    mockReactRouterHandler.mockReset();
    mockReactRouterHandler.mockResolvedValue(new Response('ok'));
  });

  it('throws when storefront is missing from load context', async () => {
    const handler = createRequestHandler({
      build: {} as any,
      getLoadContext: () => ({}),
    });

    const request = createDocumentRequest();

    await expect(handler(request)).rejects.toThrow(
      'Storefront instance is required',
    );
  });

  it('proxies SFAPI requests when storefront is present', async () => {
    const forwardMock = vi.fn().mockResolvedValue(new Response('proxied'));
    const storefront = createMockStorefront({
      isStorefrontApiUrl: () => true,
      forward: forwardMock,
    });

    const handler = createRequestHandler({
      build: {} as any,
      getLoadContext: () => ({storefront}) as any,
    });

    const request = new Request('https://store.test/api/2024-01/graphql.json', {
      method: 'POST',
    });
    const response = await handler(request);

    expect(forwardMock).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe('proxied');
  });
});
