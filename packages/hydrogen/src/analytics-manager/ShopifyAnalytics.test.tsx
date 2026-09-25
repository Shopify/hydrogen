import {act, cleanup, render} from '@testing-library/react';
import {StrictMode} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AnalyticsContextValue} from './AnalyticsProvider';
import type {
  CustomerPrivacyApiProps,
  VisitorConsentCollected,
  VisitorConsentValues,
} from '../customer-privacy/ShopifyCustomerPrivacy';

const mocks = vi.hoisted(() => ({
  privacyOptions: undefined as CustomerPrivacyApiProps | undefined,
  readyOnMount: false,
  privacy: {
    consentStatus: 'loading' as 'loading' | 'loaded',
    currentVisitorConsent: vi.fn<() => VisitorConsentValues>(),
    analyticsProcessingAllowed: vi.fn(() => true),
    shouldShowBanner: vi.fn(() => false),
    marketingAllowed: () => true,
    saleOfDataAllowed: () => true,
  },
  sendShopifyAnalytics: vi.fn(),
  perfKit: vi.fn(() => null),
}));
vi.mock('../customer-privacy/ShopifyCustomerPrivacy', async () => {
  const {useEffect} = await import('react');
  return {
    getCustomerPrivacy: () => mocks.privacy,
    getPrivacyBanner: () => null,
    useCustomerPrivacy: (options: CustomerPrivacyApiProps) => {
      mocks.privacyOptions = options;
      useEffect(() => {
        if (mocks.readyOnMount) options.onReady?.();
      }, []);
    },
  };
});
vi.mock('@shopify/hydrogen-react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shopify/hydrogen-react')>()),
  sendShopifyAnalytics: mocks.sendShopifyAnalytics,
}));
vi.mock('./PerfKit', () => ({PerfKit: mocks.perfKit}));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useLocation: () => ({pathname: '/', search: ''}),
}));
const EMPTY_CONSENT: VisitorConsentValues = {
  analytics: '',
  marketing: '',
  preferences: '',
  sale_of_data: '',
};
const SHOP = {
  shopId: 'gid://shopify/Shop/1',
  acceptedLanguage: 'EN' as const,
  currency: 'USD' as const,
  hydrogenSubchannelId: '0',
};
const VISITOR_CONSENT: VisitorConsentCollected = {
  analyticsAllowed: true,
  firstPartyMarketingAllowed: true,
  marketingAllowed: true,
  preferencesAllowed: true,
  saleOfDataAllowed: true,
  thirdPartyMarketingAllowed: true,
};
let Analytics: (typeof import('./AnalyticsProvider'))['Analytics'];
let useAnalytics: (typeof import('./AnalyticsProvider'))['useAnalytics'];
let analytics: AnalyticsContextValue;
function ReadAnalytics() {
  analytics = useAnalytics();
  return null;
}
async function renderAnalytics(
  withPrivacyBanner = false,
  options: {canTrack?: () => boolean; strictMode?: boolean} = {},
) {
  const provider = (
    <Analytics.Provider
      cart={null}
      shop={SHOP}
      canTrack={options.canTrack}
      consent={{
        checkoutDomain: 'checkout.hydrogen.shop',
        storefrontAccessToken: 'abcdefghijklmnopqrstuvwxyz123456',
        withPrivacyBanner,
      }}
    >
      <ReadAnalytics />
    </Analytics.Provider>
  );
  render(options.strictMode ? <StrictMode>{provider}</StrictMode> : provider);
  await act(async () => {});
}
async function consentLoaded() {
  await act(async () => {
    mocks.privacy.consentStatus = 'loaded';
    mocks.privacyOptions?.onReady?.();
  });
}
describe('async analytics consent', () => {
  beforeEach(async () => {
    // Each mounted provider owns a fresh event bus in these scenarios.
    vi.resetModules();
    ({Analytics, useAnalytics} = await import('./AnalyticsProvider'));
    vi.clearAllMocks();
    mocks.readyOnMount = false;
    mocks.privacy.consentStatus = 'loading';
    mocks.privacy.currentVisitorConsent.mockReturnValue(EMPTY_CONSENT);
    mocks.privacy.analyticsProcessingAllowed.mockReturnValue(true);
    mocks.privacy.shouldShowBanner.mockReturnValue(false);
    Object.defineProperty(window, 'Shopify', {
      configurable: true,
      writable: true,
      value: {customerPrivacy: mocks.privacy},
    });
  });
  afterEach(cleanup);
  it('waits for async consent even when processing getters are permissive', async () => {
    await renderAnalytics();
    expect(analytics.canTrack()).toBe(false);
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    expect(mocks.perfKit).not.toHaveBeenCalled();
    await consentLoaded();
    expect(analytics.canTrack()).toBe(true);
    expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
    expect(mocks.perfKit).toHaveBeenCalled();
  });
  it('releases analytics after silent initialization when no banner is needed', async () => {
    await renderAnalytics(true);
    await consentLoaded();
    expect(analytics.canTrack()).toBe(true);
    expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
    expect(mocks.perfKit).toHaveBeenCalled();
  });
  it.each(['analytics', 'marketing', 'preferences'] as const)(
    'releases returning visitors with a previous %s choice without a new consent event',
    async (purpose) => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        [purpose]: 'yes',
      });
      mocks.privacy.shouldShowBanner.mockReturnValue(true);
      await renderAnalytics(true);
      await consentLoaded();
      expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
      expect(mocks.perfKit).toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    'delivers one page view for already-loaded consent (StrictMode: %s)',
    async (strictMode) => {
      mocks.privacy.consentStatus = 'loaded';
      mocks.readyOnMount = true;
      await renderAnalytics(false, {strictMode});

      expect(analytics.canTrack()).toBe(true);
      expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
      expect(mocks.perfKit).toHaveBeenCalled();
    },
  );
  it('checks Shopify consent at delivery even when a custom publishing gate allows tracking', async () => {
    mocks.privacy.currentVisitorConsent.mockReturnValue({
      ...EMPTY_CONSENT,
      analytics: 'no',
    });
    await renderAnalytics(false, {canTrack: () => true});
    await consentLoaded();

    expect(analytics.canTrack()).toBe(true);
    analytics.publish('page_viewed', {shop: SHOP, url: window.location.href});
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
  });
  it('honors a saved analytics denial even when processing getters allow it', async () => {
    mocks.privacy.currentVisitorConsent.mockReturnValue({
      ...EMPTY_CONSENT,
      analytics: 'no',
    });
    mocks.privacy.shouldShowBanner.mockReturnValue(true);
    await renderAnalytics(true);
    await consentLoaded();
    expect(analytics.canTrack()).toBe(false);
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    expect(mocks.perfKit).toHaveBeenCalled();
  });
  it('waits for a new visitor to interact with the visible default banner', async () => {
    mocks.privacy.shouldShowBanner.mockReturnValue(true);
    await renderAnalytics(true);
    await consentLoaded();
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    expect(mocks.perfKit).not.toHaveBeenCalled();
    await act(async () => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        analytics: 'yes',
      });
      mocks.privacyOptions?.onVisitorConsentCollected?.(VISITOR_CONSENT);
    });
    expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
    expect(mocks.perfKit).toHaveBeenCalled();
  });
  it('ignores sale_of_data-only startup events until the visitor interacts with the banner', async () => {
    mocks.privacy.currentVisitorConsent.mockReturnValue({
      ...EMPTY_CONSENT,
      sale_of_data: 'no',
    });
    mocks.privacy.shouldShowBanner.mockReturnValue(true);
    await renderAnalytics(true);
    await consentLoaded();

    // A GPC opt-out is not interaction with the analytics consent banner.
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    expect(mocks.perfKit).not.toHaveBeenCalled();

    await act(async () => {
      mocks.privacyOptions?.onVisitorConsentCollected?.({
        ...VISITOR_CONSENT,
        saleOfDataAllowed: false,
        thirdPartyMarketingAllowed: false,
      });
    });
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    expect(mocks.perfKit).not.toHaveBeenCalled();

    await act(async () => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        analytics: 'yes',
        sale_of_data: 'no',
      });
      mocks.privacyOptions?.onVisitorConsentCollected?.({
        ...VISITOR_CONSENT,
        saleOfDataAllowed: false,
        thirdPartyMarketingAllowed: false,
      });
    });
    expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
    expect(mocks.perfKit).toHaveBeenCalled();
  });

  it('does not publish queued events after the first banner interaction denies analytics', async () => {
    mocks.privacy.consentStatus = 'loaded';
    mocks.privacy.shouldShowBanner.mockReturnValue(true);
    await renderAnalytics(true);
    await consentLoaded();

    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();

    await act(async () => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        analytics: 'no',
      });
      mocks.privacyOptions?.onVisitorConsentCollected?.({
        ...VISITOR_CONSENT,
        analyticsAllowed: false,
      });
    });

    expect(analytics.canTrack()).toBe(false);
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    expect(mocks.perfKit).toHaveBeenCalled();
  });

  it('refreshes the publishing gate when recorded choices change without changing event permissions', async () => {
    await renderAnalytics();
    await consentLoaded();
    const subscriber = vi.fn();
    analytics.subscribe('custom_consent_test', subscriber);

    await act(async () => {
      mocks.privacyOptions?.onVisitorConsentCollected?.(VISITOR_CONSENT);
    });
    analytics.publish('custom_consent_test', {});
    expect(subscriber).toHaveBeenCalledOnce();

    await act(async () => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        analytics: 'no',
      });
      mocks.privacyOptions?.onVisitorConsentCollected?.(VISITOR_CONSENT);
    });
    analytics.publish('custom_consent_test', {});
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it('updates publishing after revocation and a later consent grant', async () => {
    await renderAnalytics();
    await consentLoaded();
    mocks.sendShopifyAnalytics.mockClear();
    await act(async () => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        analytics: 'no',
      });
      mocks.privacyOptions?.onVisitorConsentCollected?.({
        ...VISITOR_CONSENT,
        analyticsAllowed: false,
      });
    });
    expect(analytics.canTrack()).toBe(false);
    analytics.publish('page_viewed', {shop: SHOP, url: window.location.href});
    expect(mocks.sendShopifyAnalytics).not.toHaveBeenCalled();
    await act(async () => {
      mocks.privacy.currentVisitorConsent.mockReturnValue({
        ...EMPTY_CONSENT,
        analytics: 'yes',
      });
      mocks.privacyOptions?.onVisitorConsentCollected?.(VISITOR_CONSENT);
    });
    expect(analytics.canTrack()).toBe(true);
    expect(mocks.sendShopifyAnalytics).toHaveBeenCalledOnce();
  });
});
