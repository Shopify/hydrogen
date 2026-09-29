import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act, cleanup} from '@testing-library/react';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
} from './ShopifyCustomerPrivacy.js';

const {loadScriptMock, revalidateMock} = vi.hoisted(() => ({
  loadScriptMock: vi.fn(() => Promise.resolve(true)),
  revalidateMock: vi.fn(() => Promise.resolve()),
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useRevalidator: () => ({revalidate: revalidateMock, state: 'idle'}),
}));

vi.mock('@shopify/hydrogen-react/load-script', () => ({
  loadScript: loadScriptMock,
}));

const PROPS = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
  withPrivacyBanner: false,
  sameDomainForStorefrontApi: true,
};

const CONSENT_DETAIL = {
  analyticsAllowed: true,
  marketingAllowed: false,
  preferencesAllowed: true,
  saleOfDataAllowed: false,
  firstPartyMarketingAllowed: false,
  thirdPartyMarketingAllowed: false,
};

type TestCustomerPrivacy = {
  consentStatus?: 'loading' | 'loaded';
  cachedToken?: Record<string, string | number>;
  cachedConsent?: string;
  [key: string]: any;
};

function consentGlobal(): TestCustomerPrivacy {
  return window.Shopify.customerPrivacy as unknown as TestCustomerPrivacy;
}

function installConsentApi(values: Partial<TestCustomerPrivacy> = {}) {
  const api = {
    ...consentGlobal(),
    consentStatus: 'loading',
    setTrackingConsent: vi.fn(),
    shouldShowBanner: vi.fn(() => false),
    currentVisitorConsent: vi.fn(() => ({
      analytics: 'yes',
      marketing: 'no',
      preferences: 'yes',
      sale_of_data: 'no',
    })),
    analyticsProcessingAllowed: vi.fn(() => true),
    __internal: {
      uniqueToken: () => consentGlobal().cachedToken?._shopify_y,
      visitToken: () => consentGlobal().cachedToken?._shopify_s,
    },
    ...values,
  };
  window.Shopify.customerPrivacy = api as any;
  return api;
}

async function finishConsent(values: Partial<TestCustomerPrivacy> = {}) {
  await act(async () => {
    Object.assign(consentGlobal(), values, {consentStatus: 'loaded'});
    document.dispatchEvent(new CustomEvent('consentTrackingApiLoaded'));
  });
}

async function consentChanged(detail = CONSENT_DETAIL) {
  await act(async () => {
    document.dispatchEvent(
      new CustomEvent('visitorConsentCollected', {detail}),
    );
  });
}

describe('useCustomerPrivacy tracking with CTA-owned consent', () => {
  beforeEach(() => {
    revalidateMock.mockReset().mockResolvedValue(undefined);
    loadScriptMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as any).Shopify;
    delete (window as any).privacyBanner;
  });

  it.each([true, false])(
    'leaves consent fetching and cache writes to CTA (proxy: %s)',
    async (sameDomainForStorefrontApi) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const onReady = vi.fn();
      renderHook(() =>
        useCustomerPrivacy({...PROPS, sameDomainForStorefrontApi, onReady}),
      );
      await act(async () => {
        installConsentApi();
      });
      expect(onReady).not.toHaveBeenCalled();

      const cachedToken = Object.freeze({
        _shopify_y: 'cta-unique',
        _shopify_s: 'cta-visit',
        _shopify_y_expires_at: Date.now() + 60_000,
        _shopify_s_expires_at: Date.now() + 60_000,
      });
      await finishConsent({cachedToken, cachedConsent: 'cta-consent'});

      expect(fetchMock).not.toHaveBeenCalled();
      expect(getCustomerPrivacy()).toBe(consentGlobal());
      expect(consentGlobal().cachedToken).toBe(cachedToken);
      expect(consentGlobal().cachedConsent).toBe('cta-consent');
      expect(onReady).toHaveBeenCalledTimes(1);
    },
  );

  it('uses initial CTA tracking values as the baseline without revalidation', async () => {
    renderHook(() => useCustomerPrivacy(PROPS));
    await act(async () => {
      installConsentApi();
    });
    await finishConsent({
      cachedToken: {_shopify_y: 'cta-unique', _shopify_s: 'cta-visit'},
    });
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it('revalidates changed tracking values and forwards subsequent consent choices', async () => {
    const onVisitorConsentCollected = vi.fn();
    renderHook(() => useCustomerPrivacy({...PROPS, onVisitorConsentCollected}));
    await act(async () => {
      installConsentApi();
    });
    await finishConsent({
      cachedToken: {_shopify_y: 'initial-unique', _shopify_s: 'initial-visit'},
    });
    expect(revalidateMock).not.toHaveBeenCalled();

    consentGlobal().cachedToken = {
      _shopify_y: 'updated-unique',
      _shopify_s: 'updated-visit',
    };
    await consentChanged();
    expect(revalidateMock).toHaveBeenCalledTimes(1);
    expect(onVisitorConsentCollected).toHaveBeenCalledWith(CONSENT_DETAIL);

    await consentChanged();
    expect(revalidateMock).toHaveBeenCalledTimes(1);
  });

  it('uses the latest consent callback without reloading the script', async () => {
    const firstCallback = vi.fn();
    const nextCallback = vi.fn();
    const {rerender} = renderHook(
      (onVisitorConsentCollected) =>
        useCustomerPrivacy({...PROPS, onVisitorConsentCollected}),
      {initialProps: firstCallback},
    );
    await act(async () => {
      installConsentApi();
    });
    await finishConsent();
    const loadCount = loadScriptMock.mock.calls.length;
    rerender(nextCallback);
    await consentChanged();

    expect(firstCallback).not.toHaveBeenCalled();
    expect(nextCallback).toHaveBeenCalledWith(CONSENT_DETAIL);
    expect(loadScriptMock).toHaveBeenCalledTimes(loadCount);
  });

  it('handles later revalidation failure without affecting readiness', async () => {
    const onReady = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    revalidateMock.mockRejectedValueOnce(new Error('offline'));
    renderHook(() => useCustomerPrivacy({...PROPS, onReady}));
    await act(async () => {
      installConsentApi();
    });
    await finishConsent({cachedToken: {_shopify_y: 'cta-unique'}});
    expect(revalidateMock).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    consentGlobal().cachedToken = {_shopify_y: 'updated-unique'};
    await consentChanged();

    expect(revalidateMock).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Revalidation failed'),
    );
  });

  it('leaves legacy consent initialization and cookie expiration to CTA', async () => {
    vi.spyOn(document, 'cookie', 'get').mockReturnValue(
      '_shopify_y=legacy-unique; _shopify_s=legacy-visit; _tracking_consent=legacy-consent',
    );
    const writeCookie = vi
      .spyOn(document, 'cookie', 'set')
      .mockImplementation(() => {});
    const setTrackingConsent = vi.fn();
    const onReady = vi.fn();
    renderHook(() => useCustomerPrivacy({...PROPS, onReady}));
    await act(async () => {
      installConsentApi({setTrackingConsent});
    });

    await finishConsent({
      cachedToken: {_shopify_y: 'cta-unique', _shopify_s: 'cta-visit'},
      cachedConsent: 'cta-consent',
    });
    expect(setTrackingConsent).not.toHaveBeenCalled();
    expect(writeCookie).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);

    consentGlobal().cachedToken = {};
    consentGlobal().cachedConsent = 'cta-declined-consent';
    await consentChanged({...CONSENT_DETAIL, analyticsAllowed: false});
    expect(setTrackingConsent).not.toHaveBeenCalled();
    expect(writeCookie).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});
