// @vitest-environment node
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStorefrontClient} from '../storefront';
import {createCartHandler} from './createCartHandler';

const STORE_DOMAIN = 'https://test-store.myshopify.com';
const SESSION_COOKIE = '_shopify_analytics=a; _shopify_essential=old';
const ASSIGNED_ESSENTIAL =
  '_shopify_essential=new; Path=/; HttpOnly; Secure; SameSite=Lax';
const ASSIGNED_ANALYTICS = '_shopify_analytics=b; Path=/; Secure';
const CART_ID = 'gid://shopify/Cart/c1-123';
const LINES = [{merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1}];

function jsonResponse(body: unknown, setCookies: string[] = [], status = 200) {
  const headers = new Headers({'content-type': 'application/json'});
  for (const setCookie of setCookies) headers.append('set-cookie', setCookie);
  return new Response(JSON.stringify(body), {status, headers});
}

function assignResponse(setCookies: string[] = [ASSIGNED_ESSENTIAL]) {
  return jsonResponse({data: {rolloutsAssign: {userErrors: []}}}, setCookies);
}

function cartResponse(mutation: string, setCookies: string[] = []) {
  return jsonResponse(
    {
      data: {
        [mutation]: {
          cart: {id: CART_ID, checkoutUrl: `${STORE_DOMAIN}/checkout`},
          userErrors: [],
          warnings: [],
        },
      },
    },
    setCookies,
  );
}

function createCart({
  assignRollouts = true,
  cartId,
  privateToken = true,
}: {assignRollouts?: boolean; cartId?: string; privateToken?: boolean} = {}) {
  const {storefront} = createStorefrontClient({
    storeDomain: STORE_DOMAIN,
    publicStorefrontToken: 'public-token',
    ...(privateToken && {privateStorefrontToken: 'private-token'}),
    logErrors: false,
    storefrontHeaders: {
      requestGroupId: 'request-group',
      buyerIp: '::1',
      buyerIpSig: null,
      cookie: SESSION_COOKIE,
      purpose: null,
    },
  });
  const cart = createCartHandler({
    storefront,
    getCartId: () => cartId,
    setCartId: () => new Headers(),
    assignRollouts,
  });
  return {storefront, cart};
}

function storefrontCall(index: number) {
  const call = mockFetch.mock.calls[index];
  expect(call, `expected Storefront API call ${index}`).toBeDefined();
  const [url, init] = call as [string, RequestInit];
  return {
    url,
    query: JSON.parse(init.body as string).query as string,
    headers: init.headers as Record<string, string>,
  };
}

function forwardedSetCookies(storefront: {
  setCollectedSubrequestHeaders: (response: {headers: Headers}) => void;
}) {
  const response = new Response();
  storefront.setCollectedSubrequestHeaders(response);
  return response.headers.getSetCookie();
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createCartHandler with assignRollouts', () => {
  it('does not assign without the option', async () => {
    mockFetch.mockResolvedValueOnce(cartResponse('cartCreate'));
    const {cart} = createCart({assignRollouts: false});

    await cart.addLines(LINES);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain('cartCreate');
  });

  it('assigns before creating a cart and sends the assigned session cookie on later calls', async () => {
    mockFetch
      .mockResolvedValueOnce(
        assignResponse([ASSIGNED_ESSENTIAL, ASSIGNED_ANALYTICS]),
      )
      .mockResolvedValueOnce(
        cartResponse('cartCreate', ['_shopify_essential=newer; Path=/']),
      );
    const {storefront, cart} = createCart();

    const result = await cart.addLines(LINES);

    expect(result.cart.id).toBe(CART_ID);
    const assign = storefrontCall(0);
    expect(assign.url).toBe(`${STORE_DOMAIN}/api/unstable/graphql.json`);
    expect(assign.query).toContain('rolloutsAssign');
    expect(assign.headers['Shopify-Storefront-Private-Token']).toBe(
      'private-token',
    );
    expect(assign.headers.cookie).toBe(SESSION_COOKIE);

    const cartWrite = storefrontCall(1);
    expect(cartWrite.url).not.toContain('unstable');
    expect(cartWrite.query).toContain('cartCreate');
    expect(cartWrite.headers.cookie).toBe(
      '_shopify_analytics=a; _shopify_essential=new',
    );
    expect(storefront.getHeaders().cookie).toBe(
      '_shopify_analytics=a; _shopify_essential=new',
    );

    expect(forwardedSetCookies(storefront)).toEqual([
      ASSIGNED_ESSENTIAL,
      ASSIGNED_ANALYTICS,
      '_shopify_essential=newer; Path=/',
    ]);
  });

  it('assigns before adding lines to an existing cart', async () => {
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(cartResponse('cartLinesAdd'));
    const {storefront, cart} = createCart({cartId: CART_ID});

    await cart.addLines(LINES);

    expect(storefrontCall(0).query).toContain('rolloutsAssign');
    const cartWrite = storefrontCall(1);
    expect(cartWrite.query).toContain('cartLinesAdd');
    expect(cartWrite.headers.cookie).toBe(
      '_shopify_analytics=a; _shopify_essential=new',
    );
    expect(forwardedSetCookies(storefront)).toEqual([ASSIGNED_ESSENTIAL]);
  });

  it('assigns once per request', async () => {
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(cartResponse('cartCreate'))
      .mockResolvedValueOnce(cartResponse('cartLinesAdd'));
    const {cart} = createCart();

    await cart.create({lines: LINES});
    await cart.addLines(LINES);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(storefrontCall(1).query).toContain('cartCreate');
    expect(storefrontCall(2).query).toContain('cartLinesAdd');
  });

  it.each([
    [
      'updateLines',
      'cartLinesUpdate',
      (cart: ReturnType<typeof createCart>['cart']) =>
        cart.updateLines([{id: 'gid://shopify/CartLine/1', quantity: 2}]),
    ],
    [
      'removeLines',
      'cartLinesRemove',
      (cart: ReturnType<typeof createCart>['cart']) =>
        cart.removeLines(['gid://shopify/CartLine/1']),
    ],
    [
      'updateDiscountCodes',
      'cartDiscountCodesUpdate',
      (cart: ReturnType<typeof createCart>['cart']) =>
        cart.updateDiscountCodes(['SAVE10']),
    ],
    [
      'updateNote',
      'cartNoteUpdate',
      (cart: ReturnType<typeof createCart>['cart']) => cart.updateNote('Gift'),
    ],
  ])('does not assign before %s', async (_method, mutation, run) => {
    mockFetch.mockResolvedValueOnce(cartResponse(mutation));
    const {cart} = createCart({cartId: CART_ID});

    await run(cart);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain(mutation);
  });

  it('does not assign without a private token', async () => {
    mockFetch.mockResolvedValueOnce(cartResponse('cartCreate'));
    const {cart} = createCart({privateToken: false});

    await cart.addLines(LINES);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain('cartCreate');
  });

  it.each([
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
    [
      'a non-200 response',
      () =>
        Promise.resolve(
          jsonResponse({}, ['_shopify_essential=stale; Path=/'], 502),
        ),
    ],
    [
      'GraphQL errors',
      () =>
        Promise.resolve(
          jsonResponse({errors: [{message: "Field doesn't exist"}]}, [
            '_shopify_essential=stale; Path=/',
          ]),
        ),
    ],
    [
      'an assignment user error',
      () =>
        Promise.resolve(
          jsonResponse(
            {
              data: {
                rolloutsAssign: {
                  userErrors: [
                    {code: 'ASSIGNMENT_FAILED', field: null, message: 'Failed'},
                  ],
                },
              },
            },
            ['_shopify_essential=stale; Path=/'],
          ),
        ),
    ],
  ])('still writes the cart after %s', async (_failure, assignResult) => {
    mockFetch
      .mockImplementationOnce(assignResult)
      .mockResolvedValueOnce(cartResponse('cartCreate'));
    const {storefront, cart} = createCart();

    const result = await cart.addLines(LINES);

    expect(result.cart.id).toBe(CART_ID);
    expect(storefrontCall(0).query).toContain('rolloutsAssign');
    expect(storefrontCall(1).headers.cookie).toBe(SESSION_COOKIE);
    expect(forwardedSetCookies(storefront)).toEqual([]);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('still writes the cart when the assignment times out after one second', async () => {
    const controller = new AbortController();
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const timeoutSpy = vi
      .spyOn(AbortSignal, 'timeout')
      .mockImplementation((ms) =>
        ms === 1000 ? controller.signal : timeout(ms),
      );
    mockFetch
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(init.signal?.reason),
            );
            controller.abort(
              new DOMException('The operation timed out.', 'TimeoutError'),
            );
          }),
      )
      .mockResolvedValueOnce(cartResponse('cartCreate'));
    const {cart} = createCart();

    const result = await cart.addLines(LINES);

    expect(timeoutSpy).toHaveBeenCalledWith(1000);
    expect(result.cart.id).toBe(CART_ID);
    expect(storefrontCall(1).headers.cookie).toBe(SESSION_COOKIE);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('forwards the assignment cookies after cookies captured before the assignment', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({data: {shop: {name: 'Shop'}}}, [
          '_shopify_essential=earlier; Path=/',
        ]),
      )
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(cartResponse('cartCreate'));
    const {storefront, cart} = createCart();

    await storefront.query('query Shop { shop { name } }', {
      cache: storefront.CacheNone(),
    });
    await cart.addLines(LINES);

    expect(forwardedSetCookies(storefront)).toEqual([
      '_shopify_essential=earlier; Path=/',
      ASSIGNED_ESSENTIAL,
    ]);
  });

  it('forwards the assignment cookies after cookies from a request sent before the assignment that responds after it', async () => {
    let respondToQuery = () => {};
    mockFetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            respondToQuery = () =>
              resolve(
                jsonResponse({data: {shop: {name: 'Shop'}}}, [
                  '_shopify_essential=earlier; Path=/',
                ]),
              );
          }),
      )
      .mockResolvedValueOnce(assignResponse())
      .mockImplementationOnce(async () => {
        respondToQuery();
        await new Promise((resolve) => setTimeout(resolve, 0));
        return cartResponse('cartCreate', ['_shopify_essential=newer; Path=/']);
      });
    const {storefront, cart} = createCart();

    const query = storefront.query('query Shop { shop { name } }', {
      cache: storefront.CacheNone(),
    });
    await cart.addLines(LINES);
    await query;

    expect(forwardedSetCookies(storefront)).toEqual([
      '_shopify_essential=earlier; Path=/',
      ASSIGNED_ESSENTIAL,
    ]);
  });

  it('forwards the assignment cookies when the cart write fails', async () => {
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(new Response('Internal error', {status: 500}));
    const {storefront, cart} = createCart();

    await expect(cart.addLines(LINES)).rejects.toThrow();

    expect(forwardedSetCookies(storefront)).toEqual([ASSIGNED_ESSENTIAL]);
  });

  it('does not send a cleared session cookie', async () => {
    mockFetch
      .mockResolvedValueOnce(
        assignResponse(['_shopify_essential=; Max-Age=0; Path=/']),
      )
      .mockResolvedValueOnce(cartResponse('cartCreate'));
    const {cart} = createCart();

    await cart.addLines(LINES);

    expect(storefrontCall(1).headers.cookie).toBe(SESSION_COOKIE);
  });
});
