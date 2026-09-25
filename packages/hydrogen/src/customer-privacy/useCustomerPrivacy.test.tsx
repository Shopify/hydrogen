import {StrictMode} from 'react';
import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act, cleanup, waitFor} from '@testing-library/react';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
  CONSENT_API,
  CONSENT_API_WITH_BANNER,
  type CustomerPrivacyApiProps,
} from './ShopifyCustomerPrivacy.js';

const {loadScriptMock, revalidateMock} = vi.hoisted(() => ({
  loadScriptMock: vi.fn(),
  revalidateMock: vi.fn(() => Promise.resolve()),
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useRevalidator: () => ({revalidate: revalidateMock, state: 'idle'}),
}));

vi.mock('@shopify/hydrogen-react/load-script', async () => {
  const {useEffect} = await import('react');
  return {
    loadScript: loadScriptMock,
    useLoadScript: (url: string, options: unknown) => {
      useEffect(() => {
        void loadScriptMock(url, options);
      }, [url]);
      return 'done';
    },
  };
});

const PROPS: CustomerPrivacyApiProps = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
  sameDomainForStorefrontApi: false,
};

const legacyReadyEvent = vi.fn();

type TestCustomerPrivacy = {
  config?: Record<string, any>;
  consentStatus?: 'loading' | 'loaded';
  setTrackingConsent?: ReturnType<typeof vi.fn>;
  [key: string]: any;
};

function consentGlobal(): TestCustomerPrivacy {
  return window.Shopify.customerPrivacy as unknown as TestCustomerPrivacy;
}

function installConsentApi(consentStatus: 'loading' | 'loaded' = 'loading') {
  const api = {
    ...consentGlobal(),
    consentStatus,
    setTrackingConsent: vi.fn(),
    shouldShowBanner: vi.fn(() => false),
    currentVisitorConsent: vi.fn(() => ({})),
    analyticsProcessingAllowed: vi.fn(() => true),
  };
  // Keep references to the original mocks; Hydrogen wraps methods in place.
  window.Shopify.customerPrivacy = {...api} as any;
  return api;
}

function installBanner() {
  const api = {loadBanner: vi.fn(), showPreferences: vi.fn()};
  window.privacyBanner = {...api};
  return api;
}

async function consentLoaded() {
  await act(async () => {
    consentGlobal().consentStatus = 'loaded';
    document.dispatchEvent(new CustomEvent('consentTrackingApiLoaded'));
  });
}

describe('useCustomerPrivacy async initialization', () => {
  beforeEach(() => {
    revalidateMock.mockClear();
    legacyReadyEvent.mockClear();
    document.addEventListener(
      'shopifyCustomerPrivacyApiLoaded',
      legacyReadyEvent,
    );
    loadScriptMock.mockReset();
    // Model the shared loader's deduplication, while letting each test observe
    // the global configuration at the moment the CDN script is inserted.
    loadScriptMock.mockImplementation((src, options) => {
      if (!Array.from(document.scripts).some((script) => script.src === src)) {
        const script = document.createElement('script');
        script.src = src;
        // Keep the tag inert; each test explicitly simulates the CDN boot.
        script.type = 'application/json';
        for (const [name, value] of Object.entries(options?.attributes ?? {})) {
          script.setAttribute(name, String(value));
        }
        document.body.appendChild(script);
      }
      return Promise.resolve(true);
    });
  });

  afterEach(() => {
    cleanup();
    document.removeEventListener(
      'shopifyCustomerPrivacyApiLoaded',
      legacyReadyEvent,
    );
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.querySelectorAll('script').forEach((node) => node.remove());
    delete (window as any).Shopify;
    delete (window as any).privacyBanner;
  });

  it.each([
    [false, CONSENT_API],
    [true, CONSENT_API_WITH_BANNER],
  ])(
    'configures async consent before inserting the script (banner: %s)',
    async (withPrivacyBanner, src) => {
      const originalAppend = document.body.appendChild.bind(document.body);
      const appendScript = vi.spyOn(document.body, 'appendChild');
      let configAtInsertion: unknown;
      appendScript.mockImplementation((node) => {
        if (node instanceof HTMLScriptElement) {
          configAtInsertion = {...consentGlobal().config};
        }
        return originalAppend(node);
      });

      renderHook(() =>
        useCustomerPrivacy({
          ...PROPS,
          withPrivacyBanner,
          sameDomainForStorefrontApi: true,
        }),
      );
      await waitFor(() => expect(document.scripts).toHaveLength(1));

      expect(document.scripts[0].src).toBe(src);
      expect(configAtInsertion).toMatchObject({
        isHeadless: true,
        asyncConsent: true,
        asyncVisitorState: true,
        consentDomain: window.location.host,
        storefrontAccessToken: PROPS.storefrontAccessToken,
        debug: {hydrogen: {generation: 2, serverTiming: false}},
      });
    },
  );

  it('defaults to same-origin consent without a Server-Timing marker', async () => {
    const {sameDomainForStorefrontApi: _override, ...props} = PROPS;
    renderHook(() => useCustomerPrivacy(props));
    await act(async () => {});
    expect(consentGlobal().config?.consentDomain).toBe(window.location.host);
  });

  it('uses checkout for consent when the Storefront API proxy is disabled', async () => {
    renderHook(() => useCustomerPrivacy(PROPS));
    await act(async () => {});
    expect(consentGlobal().config?.consentDomain).toBe(PROPS.checkoutDomain);
    expect(getCustomerPrivacy()).toBeNull();
  });

  it('preserves unrelated Shopify and consent configuration and supplies banner localization', async () => {
    (window as any).Shopify = {
      currency: {active: 'EUR'},
      locale: 'fr',
      country: 'FR',
      customerPrivacy: {
        config: {merchantOption: 'kept', debug: {customDebug: true}},
      },
    };

    renderHook(() =>
      useCustomerPrivacy({...PROPS, locale: 'DE', country: 'AT'}),
    );
    await act(async () => {});

    expect((window as any).Shopify).toMatchObject({
      currency: {active: 'EUR'},
      locale: 'de',
      country: 'AT',
    });
    expect(consentGlobal().config).toMatchObject({
      merchantOption: 'kept',
      asyncConsent: true,
      debug: {
        customDebug: true,
        hydrogen: {generation: 2, serverTiming: false},
      },
    });
  });

  it('preserves existing localization when none is supplied', async () => {
    (window as any).Shopify = {locale: 'fr', country: 'FR'};
    renderHook(() => useCustomerPrivacy(PROPS));
    await act(async () => {});
    expect((window as any).Shopify.locale).toBe('fr');
    expect((window as any).Shopify.country).toBe('FR');
  });

  it('waits for consent even after the script and API methods are available', async () => {
    const onReady = vi.fn();
    const {result} = renderHook(() => useCustomerPrivacy({...PROPS, onReady}));
    expect(result.current.customerPrivacy).toBeNull();

    await act(async () => {
      installConsentApi();
      document.dispatchEvent(new CustomEvent('consentTrackingApiLoaded'));
    });
    expect(onReady).not.toHaveBeenCalled();
    expect(legacyReadyEvent).not.toHaveBeenCalled();

    await consentLoaded();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(legacyReadyEvent).toHaveBeenCalledTimes(1);
    expect(result.current.customerPrivacy?.setTrackingConsent).toBeTypeOf(
      'function',
    );
  });

  it('waits for the PB API as well as consent, without calling loadBanner again', async () => {
    let resolveScript!: (value: boolean) => void;
    loadScriptMock.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveScript = resolve;
      }),
    );
    const onReady = vi.fn();
    const {result} = renderHook(() =>
      useCustomerPrivacy({...PROPS, withPrivacyBanner: true, onReady}),
    );
    expect(result.current.privacyBanner).toBeNull();

    await act(async () => {
      installConsentApi('loaded');
      document.dispatchEvent(new CustomEvent('consentTrackingApiLoaded'));
    });
    expect(onReady).not.toHaveBeenCalled();

    let banner: ReturnType<typeof installBanner>;
    await act(async () => {
      banner = installBanner();
      resolveScript(true);
    });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(banner!.loadBanner).not.toHaveBeenCalled();
    expect(result.current.privacyBanner?.showPreferences).toBeTypeOf(
      'function',
    );
  });

  it('recognizes an already initialized API when mounting after the loaded event', async () => {
    (window as any).Shopify = {customerPrivacy: {config: {asyncConsent: true}}};
    const api = installConsentApi('loaded');
    const onReady = vi.fn();
    const {result} = renderHook(() => useCustomerPrivacy({...PROPS, onReady}));
    await act(async () => {});

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(result.current.customerPrivacy).not.toBeNull();
    expect(api.setTrackingConsent).not.toHaveBeenCalled();
  });

  it('can become ready after a failed initialization is recovered by a consent update', async () => {
    const onReady = vi.fn();
    renderHook(() => useCustomerPrivacy({...PROPS, onReady}));
    await act(async () => {
      installConsentApi();
      delete consentGlobal().consentStatus;
    });
    expect(onReady).not.toHaveBeenCalled();

    await act(async () => {
      consentGlobal().consentStatus = 'loaded';
      document.dispatchEvent(
        new CustomEvent('visitorConsentCollected', {
          detail: {analyticsAllowed: false},
        }),
      );
    });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('does not publish readiness again on repeated consent events or rerenders', async () => {
    const onReady = vi.fn();
    const {rerender} = renderHook(() =>
      useCustomerPrivacy({...PROPS, onReady}),
    );
    await act(async () => {
      installConsentApi();
    });
    await consentLoaded();
    await consentLoaded();
    await act(async () => {
      document.dispatchEvent(
        new CustomEvent('visitorConsentCollected', {
          detail: {analyticsAllowed: true},
        }),
      );
    });
    rerender();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('survives StrictMode effect replay and remount with the initialized globals', async () => {
    const onReady = vi.fn();
    const first = renderHook(() => useCustomerPrivacy({...PROPS, onReady}), {
      wrapper: StrictMode,
    });
    await act(async () => {
      installConsentApi();
    });
    await consentLoaded();
    expect(onReady).toHaveBeenCalledTimes(1);
    first.unmount();

    const onRemountReady = vi.fn();
    renderHook(() => useCustomerPrivacy({...PROPS, onReady: onRemountReady}), {
      wrapper: StrictMode,
    });
    await act(async () => {});
    expect(onRemountReady).toHaveBeenCalledTimes(1);
    expect(document.scripts).toHaveLength(1);
    expect(legacyReadyEvent).toHaveBeenCalledTimes(1);
  });

  it('preserves configured setTrackingConsent and showPreferences calls', async () => {
    const {result} = renderHook(() =>
      useCustomerPrivacy({
        ...PROPS,
        withPrivacyBanner: true,
        locale: 'DE',
        country: 'AT',
      }),
    );
    let api: ReturnType<typeof installConsentApi>;
    let banner: ReturnType<typeof installBanner>;
    await act(async () => {
      api = installConsentApi('loaded');
      banner = installBanner();
      document.dispatchEvent(new CustomEvent('consentTrackingApiLoaded'));
    });

    const callback = vi.fn();
    result.current.customerPrivacy!.setTrackingConsent(
      {
        analytics: true,
        marketing: false,
        preferences: true,
        sale_of_data: false,
      },
      callback,
    );
    expect(api!.setTrackingConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        analytics: true,
        marketing: false,
        headlessStorefront: true,
        checkoutRootDomain: PROPS.checkoutDomain,
        storefrontAccessToken: PROPS.storefrontAccessToken,
      }),
      callback,
    );
    result.current.privacyBanner!.showPreferences({locale: 'FR'});
    expect(banner!.showPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'FR',
        country: 'AT',
        storefrontAccessToken: PROPS.storefrontAccessToken,
      }),
    );
  });
});
