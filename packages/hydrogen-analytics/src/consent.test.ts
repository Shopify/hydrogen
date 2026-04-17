import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {initConsent, _resetConsentInterceptorsForTesting} from './consent';

vi.mock('./utils/load-script', () => ({
  loadScript: vi.fn(() => Promise.resolve()),
}));

vi.mock('./utils/tracking-values', () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: 'test-unique',
    visitToken: 'test-visit',
    consent: null,
  })),
}));

const CONSENT_CONFIG = {
  checkoutDomain: 'checkout.hydrogen.shop',
  storefrontAccessToken: '33ad0f277e864013b8e3c21d19432501',
};

function createMockDeps(overrides = {}) {
  const readyCalls: Array<() => void> = [];
  return {
    deps: {
      consent: CONSENT_CONFIG,
      subscribe: vi.fn(() => () => {}),
      register: vi.fn((_key: string) => {
        const readyFn = vi.fn();
        readyCalls.push(readyFn);
        return {ready: readyFn};
      }),
      publishInternal: vi.fn(),
      canTrack: () => true,
      ...overrides,
    },
    readyCalls,
  };
}

/**
 * Simulates the consent script setting window.Shopify.customerPrivacy.
 * This is the sequence that the real consent-tracking-api.js performs:
 * 1. window.Shopify = {}
 * 2. window.Shopify.customerPrivacy = { setTrackingConsent, ... }
 */
function simulateConsentScriptLoad() {
  (window as any).Shopify = {};
  (window as any).Shopify.customerPrivacy = {
    setTrackingConsent: vi.fn(),
    analyticsProcessingAllowed: () => true,
    marketingAllowed: () => true,
    saleOfDataAllowed: () => true,
  };
}

describe('noInteraction consent guard', () => {
  beforeEach(() => {
    _resetConsentInterceptorsForTesting();
  });

  it('ignores premature visitorConsentCollected when banner shown but no interaction', () => {
    const {deps} = createMockDeps({
      consent: {...CONSENT_CONFIG, withPrivacyBanner: true},
    });
    initConsent(deps);

    // Set up customerPrivacy with shouldShowBanner=true and empty consent values
    (window as any).Shopify = {};
    (window as any).Shopify.customerPrivacy = {
      setTrackingConsent: vi.fn(),
      analyticsProcessingAllowed: () => true,
      marketingAllowed: () => true,
      saleOfDataAllowed: () => true,
      shouldShowBanner: () => true,
      currentVisitorConsent: () => ({
        marketing: '',
        analytics: '',
        preferences: '',
        sale_of_data: '',
      }),
    };

    // Dispatch premature consent event
    document.dispatchEvent(new CustomEvent('visitorConsentCollected'));

    // publishInternal should NOT have been called (guard filters premature event)
    expect(deps.publishInternal).not.toHaveBeenCalled();
  });

  it('allows visitorConsentCollected when user has interacted (non-empty values)', () => {
    const {deps} = createMockDeps({
      consent: {...CONSENT_CONFIG, withPrivacyBanner: true},
    });
    initConsent(deps);

    simulateConsentScriptLoad();

    // Add shouldShowBanner and currentVisitorConsent with actual values
    (window as any).Shopify.customerPrivacy.shouldShowBanner = () => true;
    (window as any).Shopify.customerPrivacy.currentVisitorConsent = () => ({
      marketing: 'yes',
      analytics: 'yes',
      preferences: 'yes',
      sale_of_data: 'yes',
    });

    document.dispatchEvent(new CustomEvent('visitorConsentCollected'));

    expect(deps.publishInternal).toHaveBeenCalledWith(
      '_internal:consent_collected',
      expect.objectContaining({trackingValuesChanged: false}),
    );
  });
});

describe('shopifyCustomerPrivacyApiLoaded DOM event', () => {
  beforeEach(() => {
    _resetConsentInterceptorsForTesting();
  });

  it('dispatches shopifyCustomerPrivacyApiLoaded once after consent loads', () => {
    const listener = vi.fn();
    document.addEventListener('shopifyCustomerPrivacyApiLoaded', listener);

    const {deps} = createMockDeps();
    initConsent(deps);
    simulateConsentScriptLoad();

    expect(listener).toHaveBeenCalledOnce();

    document.removeEventListener('shopifyCustomerPrivacyApiLoaded', listener);
  });

  it('does not dispatch shopifyCustomerPrivacyApiLoaded again on second initConsent', () => {
    const listener = vi.fn();
    document.addEventListener('shopifyCustomerPrivacyApiLoaded', listener);

    const instance1 = createMockDeps();
    initConsent(instance1.deps);
    simulateConsentScriptLoad();

    expect(listener).toHaveBeenCalledOnce();

    // Second instance should not dispatch again
    const instance2 = createMockDeps();
    initConsent(instance2.deps);

    expect(listener).toHaveBeenCalledOnce();

    document.removeEventListener('shopifyCustomerPrivacyApiLoaded', listener);
  });
});

describe('consent config validation', () => {
  beforeEach(() => {
    _resetConsentInterceptorsForTesting();
  });

  it('logs error when checkoutDomain is empty', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {deps} = createMockDeps({
      consent: {
        checkoutDomain: '',
        storefrontAccessToken: '33ad0f277e864013b8e3c21d19432501',
      },
    });
    initConsent(deps);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('checkoutDomain'),
    );
    errorSpy.mockRestore();
  });

  it('logs error when storefrontAccessToken is empty', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {deps} = createMockDeps({
      consent: {
        checkoutDomain: 'checkout.hydrogen.shop',
        storefrontAccessToken: '',
      },
    });
    initConsent(deps);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('storefrontAccessToken'),
    );
    errorSpy.mockRestore();
  });

  it('logs error when storefrontAccessToken looks like a private token', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {deps} = createMockDeps({
      consent: {
        checkoutDomain: 'checkout.hydrogen.shop',
        storefrontAccessToken: 'shpat_abc123def456ghi789jkl012mno',
      },
    });
    initConsent(deps);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('private access token'),
    );
    errorSpy.mockRestore();
  });
});

describe('privacy banner timeout fallback', () => {
  beforeEach(() => {
    _resetConsentInterceptorsForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unblocks bus after 10s timeout when banner script is blocked', () => {
    const {deps, readyCalls} = createMockDeps({
      consent: {...CONSENT_CONFIG, withPrivacyBanner: true},
    });
    initConsent(deps);

    // Simulate consent script loading (sets shopifySubscriptionsReady)
    simulateConsentScriptLoad();

    // Before timeout: not ready (privacyReady is false, waiting for banner interaction)
    expect(readyCalls[0]).not.toHaveBeenCalled();

    // Advance past the 10-second banner timeout
    vi.advanceTimersByTime(10001);

    // Now ready — timeout set privacyReady=true
    expect(readyCalls[0]).toHaveBeenCalled();
  });

  it('non-banner mode still uses 3-second timeout', () => {
    const {deps, readyCalls} = createMockDeps();
    initConsent(deps);

    simulateConsentScriptLoad();

    // Before 3s timeout: not ready
    expect(readyCalls[0]).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3001);

    expect(readyCalls[0]).toHaveBeenCalled();
  });
});

describe('initConsent interceptor isolation', () => {
  beforeEach(() => {
    _resetConsentInterceptorsForTesting();
  });

  it('second initConsent does not overwrite first instance interceptor', () => {
    const instance1 = createMockDeps();
    const instance2 = createMockDeps();

    initConsent(instance1.deps);
    initConsent(instance2.deps);

    simulateConsentScriptLoad();

    // Both instances should have their register.ready() called
    // (via the shopifySubscriptionsReady -> checkReady path, once privacyReady is also true)
    // The consent timeout (3s) handles privacyReady for non-banner mode.
    // For this test, we verify both instances got notified by the interceptor
    // by checking that both instances' register functions were invoked.
    //
    // Since we can't easily trigger privacyReady without waiting for the timeout
    // or dispatching visitorConsentCollected, we verify the more fundamental
    // property: both instances received the shopify ready notification.
    // We do this by checking that window.Shopify.customerPrivacy is available
    // (the interceptor completed) and that the setTrackingConsent wrapper works.
    const cp = (window as any).Shopify?.customerPrivacy;
    expect(cp).toBeDefined();
    expect(cp.setTrackingConsent).toBeDefined();

    // The wrapped setTrackingConsent should include headlessStorefront: true
    cp.setTrackingConsent({marketing: true}, vi.fn());
    const originalSetTracking = vi.fn();
    // The original was replaced by the wrapper — verify the API shape is intact
    expect(typeof cp.setTrackingConsent).toBe('function');

    // To truly verify both instances were notified, dispatch the consent event
    // which sets privacyReady and triggers checkReady on both instances
    document.dispatchEvent(new CustomEvent('visitorConsentCollected'));

    // Both instances' register ready should have been called
    expect(instance1.readyCalls[0]).toHaveBeenCalled();
    expect(instance2.readyCalls[0]).toHaveBeenCalled();
  });

  it('late initConsent call gets immediate notification if consent already resolved', () => {
    const instance1 = createMockDeps();
    initConsent(instance1.deps);

    // Simulate consent resolution
    simulateConsentScriptLoad();
    document.dispatchEvent(new CustomEvent('visitorConsentCollected'));

    // First instance should be ready
    expect(instance1.readyCalls[0]).toHaveBeenCalled();

    // Now create a second instance AFTER consent has already resolved
    const instance2 = createMockDeps();
    initConsent(instance2.deps);

    // The late subscriber should be notified immediately because
    // shopifyConsentResolved is already true
    // We still need the visitorConsentCollected event for privacyReady,
    // but the consent event listener is per-instance, so dispatch again
    document.dispatchEvent(new CustomEvent('visitorConsentCollected'));

    expect(instance2.readyCalls[0]).toHaveBeenCalled();
  });
});