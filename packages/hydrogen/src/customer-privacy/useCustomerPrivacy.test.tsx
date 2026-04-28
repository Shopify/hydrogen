import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
  CONSENT_API,
  CONSENT_API_WITH_BANNER,
} from './ShopifyCustomerPrivacy.js';

const revalidateMock = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock('react-router', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('react-router');

  return {
    ...actual,
    useRevalidator: () => ({
      revalidate: revalidateMock,
      state: 'idle',
    }),
  };
});

let html: HTMLHtmlElement;
let head: HTMLHeadElement;
let body: HTMLBodyElement;

const CUSTOMER_PRIVACY_PROPS = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
  withPrivacyBanner: true,
};

describe(`useCustomerPrivacy`, () => {
  beforeEach(() => {
    revalidateMock.mockClear();

    html = document.createElement('html');
    head = document.createElement('head');
    body = document.createElement('body');

    vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      head.appendChild(node);
      return node;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      body.appendChild(node);
      return node;
    });

    html.appendChild(head);
    html.appendChild(body);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    head.innerHTML = '';
    body.innerHTML = '';
    document.querySelectorAll('script').forEach((node) => node.remove());
    delete (global.window as any).Shopify;
  });

  it('By default, loads just the customerPrivacy script', () => {
    renderHook(() =>
      useCustomerPrivacy({
        checkoutDomain: 'checkout.shopify.com',
        storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
      }),
    );
    const script = html.querySelector('body script');
    expect(script).toContainHTML(`src="${CONSENT_API}"`);
    expect(script).toContainHTML('type="text/javascript"');
  });

  it('loads the customerPrivacy with privacyBanner script', () => {
    renderHook(() => useCustomerPrivacy(CUSTOMER_PRIVACY_PROPS));
    const script = html.querySelector('body script');
    expect(script).toContainHTML(`src="${CONSENT_API_WITH_BANNER}"`);
    expect(script).toContainHTML('type="text/javascript"');
  });

  it('returns just customerPrivacy initiallly as null', () => {
    let cp;
    renderHook(() => {
      cp = useCustomerPrivacy({
        ...CUSTOMER_PRIVACY_PROPS,
        withPrivacyBanner: false,
      });
    });
    expect(cp).toEqual({customerPrivacy: null});
  });

  it('returns both customerPrivacy and privacyBanner initially as null', async () => {
    let cp;
    renderHook(() => {
      cp = useCustomerPrivacy(CUSTOMER_PRIVACY_PROPS);
    });

    // Wait until idle
    await act(async () => {});

    expect(cp).toEqual({customerPrivacy: null, privacyBanner: null});
  });

  it('returns only customerPrivacy', async () => {
    let cp;

    const initialProps = {
      ...CUSTOMER_PRIVACY_PROPS,
      withPrivacyBanner: false,
    };

    const {rerender} = renderHook(
      (props) => {
        cp = useCustomerPrivacy(props);
      },
      {initialProps},
    );

    rerender(initialProps);

    // mock the original customerPrivacy script injected APIs. It first defines the global object
    // @ts-ignore
    global.window.Shopify = {};
    global.window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    };

    // mock the original privacyBanner script injected APIs
    rerender(initialProps);

    expect(cp).toEqual({
      customerPrivacy: expect.objectContaining({
        setTrackingConsent: expect.any(Function),
      }),
    });
  });

  it('returns both customerPrivacy and privaceBanner', async () => {
    let cp;

    const {rerender} = renderHook(
      (props) => {
        cp = useCustomerPrivacy(props);
      },
      {initialProps: CUSTOMER_PRIVACY_PROPS},
    );

    rerender(CUSTOMER_PRIVACY_PROPS);

    // mock the original customerPrivacy script injected APIs. It first defines the global object
    // @ts-ignore
    global.window.Shopify = {};
    global.window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    };

    // mock the original privacyBanner script injected APIs
    rerender(CUSTOMER_PRIVACY_PROPS);

    // mock the original privacyBanner script injected APIs
    global.window.privacyBanner = {
      loadBanner: () => {},
      showPreferences: () => {},
    };

    // mock the original privacyBanner script injected APIs
    rerender(CUSTOMER_PRIVACY_PROPS);

    expect(cp).toEqual({
      customerPrivacy: expect.objectContaining({
        setTrackingConsent: expect.any(Function),
      }),
      privacyBanner: expect.objectContaining({
        loadBanner: expect.any(Function),
        showPreferences: expect.any(Function),
      }),
    });
  });

  it('installs backendConsentEnabled stub when CDN resets window.Shopify', () => {
    renderHook(() =>
      useCustomerPrivacy({
        checkoutDomain: 'checkout.shopify.com',
        storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
      }),
    );

    // Simulate the CDN's conditional assignment: window.Shopify = window.Shopify ? window.Shopify : {}
    // With no pre-populated window.Shopify, CDN assigns an empty object through the outer setter.
    global.window.Shopify = {};

    // The outer setter should have installed the stub with backendConsentEnabled = true so
    // the CDN reads the flag before it assigns the full API.
    expect(window.Shopify).toBeDefined();
    expect(window.Shopify.customerPrivacy).toBeDefined();
    expect((window.Shopify.customerPrivacy as any).backendConsentEnabled).toBe(
      true,
    );
  });

  it('getCustomerPrivacy returns null when only the backendConsent stub is present', () => {
    renderHook(() =>
      useCustomerPrivacy({
        checkoutDomain: 'checkout.shopify.com',
        storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
      }),
    );

    // CDN resets Shopify — stub is installed, full API not yet assigned
    global.window.Shopify = {};

    // Stub is present but is not the usable CustomerPrivacy API
    expect(window.Shopify.customerPrivacy).toBeDefined();
    expect((window.Shopify.customerPrivacy as any).backendConsentEnabled).toBe(
      true,
    );
    // The stub must NOT be exposed to callers as a usable CustomerPrivacy —
    // it lacks all API methods and would crash callers that call e.g. setTrackingConsent()
    expect(getCustomerPrivacy()).toBeNull();
  });

  describe('storefrontRootDomain', () => {
    // Save/restore window.location so location.host overrides don't leak across tests.
    const originalLocationDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'location',
    );

    function mockLocationHost(host: string) {
      Object.defineProperty(window, 'location', {
        value: {host},
        configurable: true,
        writable: true,
      });
    }

    afterEach(() => {
      if (originalLocationDescriptor) {
        Object.defineProperty(window, 'location', originalLocationDescriptor);
      }
    });

    function driveSetTrackingConsentLifecycle(
      props: Parameters<typeof useCustomerPrivacy>[0],
    ) {
      const originalSetTrackingConsent = vi.fn();
      let cp: ReturnType<typeof useCustomerPrivacy> | undefined;

      const {rerender} = renderHook(
        (p) => {
          cp = useCustomerPrivacy(p);
        },
        {initialProps: props},
      );
      rerender(props);

      // Simulate the CDN's `window.Shopify = {}` reset, then its assignment of
      // the real customerPrivacy API. The hook's interceptor wraps
      // setTrackingConsent at the second step.
      // @ts-ignore
      global.window.Shopify = {};
      global.window.Shopify.customerPrivacy = {
        setTrackingConsent: originalSetTrackingConsent,
      };
      rerender(props);

      return {
        originalSetTrackingConsent,
        getWrappedSetTrackingConsent: () =>
          cp!.customerPrivacy!.setTrackingConsent,
      };
    }

    it('passes storefrontRootDomain as undefined when same-origin SFAPI proxy is enabled', () => {
      mockLocationHost('shopify.example.com');

      const {originalSetTrackingConsent, getWrappedSetTrackingConsent} =
        driveSetTrackingConsentLifecycle({
          checkoutDomain: 'checkout.example.com',
          storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
          sameDomainForStorefrontApi: true,
        });

      const callback = vi.fn();
      getWrappedSetTrackingConsent()(
        {
          marketing: true,
          analytics: true,
          preferences: false,
          sale_of_data: false,
        },
        callback,
      );

      expect(originalSetTrackingConsent).toHaveBeenCalledTimes(1);
      const [payload, forwardedCallback] =
        originalSetTrackingConsent.mock.calls[0]!;

      // CDN falls back to window.location.host when storefrontRootDomain is
      // omitted, so both the primary and the backendConsentEnabled fetch route
      // through the same-origin SFAPI proxy.
      expect(payload.storefrontRootDomain).toBeUndefined();
      // checkoutRootDomain points at the same-origin proxy host.
      expect(payload.checkoutRootDomain).toBe('shopify.example.com');
      expect(payload.headlessStorefront).toBe(true);
      expect(forwardedCallback).toBe(callback);
    });

    it('passes storefrontRootDomain as a bare hostname when proxy is disabled', () => {
      mockLocationHost('shopify.example.com');

      const {originalSetTrackingConsent, getWrappedSetTrackingConsent} =
        driveSetTrackingConsentLifecycle({
          checkoutDomain: 'checkout.example.com',
          storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
          sameDomainForStorefrontApi: false,
        });

      getWrappedSetTrackingConsent()(
        {
          marketing: true,
          analytics: true,
          preferences: false,
          sale_of_data: false,
        },
        vi.fn(),
      );

      expect(originalSetTrackingConsent).toHaveBeenCalledTimes(1);
      const [payload] = originalSetTrackingConsent.mock.calls[0]!;

      // Bare hostname per https://shopify.dev/docs/api/consent-tracking,
      // never a cookie-domain shape with a leading dot.
      expect(payload.storefrontRootDomain).toBe('example.com');
      expect(payload.storefrontRootDomain).not.toMatch(/^\./);
      // checkoutRootDomain points directly at the configured checkout host
      // because the proxy is disabled.
      expect(payload.checkoutRootDomain).toBe('checkout.example.com');
    });

    it('never passes a leading-dot storefrontRootDomain regardless of proxy mode', () => {
      mockLocationHost('shopify.example.com');

      for (const sameDomainForStorefrontApi of [true, false]) {
        const {originalSetTrackingConsent, getWrappedSetTrackingConsent} =
          driveSetTrackingConsentLifecycle({
            checkoutDomain: 'checkout.example.com',
            storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
            sameDomainForStorefrontApi,
          });

        getWrappedSetTrackingConsent()(
          {
            marketing: true,
            analytics: true,
            preferences: false,
            sale_of_data: false,
          },
          vi.fn(),
        );

        expect(originalSetTrackingConsent).toHaveBeenCalledTimes(1);
        const [payload] = originalSetTrackingConsent.mock.calls[0]!;
        expect(payload.storefrontRootDomain ?? '').not.toMatch(/^\./);
      }
    });
  });

  it('triggers the onReady callback when both APIs are ready', async () => {
    const onReady = vi.fn();

    let cp;
    const {rerender} = renderHook(
      (props) => {
        cp = useCustomerPrivacy(props);
      },
      {initialProps: {...CUSTOMER_PRIVACY_PROPS, onReady}},
    );

    rerender({...CUSTOMER_PRIVACY_PROPS, onReady});

    // mock the original customerPrivacy script injected APIs. It first defines the global object
    // @ts-ignore
    global.window.Shopify = {};
    global.window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    };

    // mock the original privacyBanner script injected APIs
    rerender({...CUSTOMER_PRIVACY_PROPS, onReady});

    // mock the original privacyBanner script injected APIs
    global.window.privacyBanner = {
      loadBanner: () => {},
      showPreferences: () => {},
    };

    rerender({...CUSTOMER_PRIVACY_PROPS, onReady});

    expect(onReady).toHaveBeenCalled();
  });
});
