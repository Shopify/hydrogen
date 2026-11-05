import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act, cleanup} from '@testing-library/react';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
  type CustomerPrivacyApiProps,
} from './ShopifyCustomerPrivacy.js';

/**
 * Regression coverage for #3575.
 *
 * Browser extensions (Urban VPN is the commonly reported one) and theme-era
 * apps loaded into a headless storefront assign their own `window.Shopify`,
 * sometimes non-configurably. Hydrogen used to install property watchers with
 * `Object.defineProperty(window, 'Shopify', …)`, which then threw
 * `TypeError: Cannot redefine property: Shopify` and took the whole app down.
 *
 * These tests live in their own file on purpose: a non-configurable property
 * can be neither deleted nor redefined, so once installed it cannot be undone
 * within a test environment. Vitest gives each file a fresh environment, which
 * keeps the pollution out of the main `useCustomerPrivacy` suite.
 */

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

const PROPS: CustomerPrivacyApiProps = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
};

// Stand in for the extension: present before Hydrogen runs, and locked down.
// `writable: true` still allows assignment, which is what the Shopify CDN does.
Object.defineProperty(window, 'Shopify', {
  configurable: false,
  writable: true,
  value: {},
});

describe('useCustomerPrivacy with a non-configurable window.Shopify', () => {
  beforeEach(() => {
    window.Shopify = {theme: 'from-an-extension'} as any;
    loadScriptMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('configures consent on the existing object without replacing it', async () => {
    const extensionShopify = window.Shopify;

    renderHook(() => useCustomerPrivacy(PROPS));
    await act(async () => {});

    expect(window.Shopify).toBe(extensionShopify);
    expect((window.Shopify as any).theme).toBe('from-an-extension');
    expect((window.Shopify as any).customerPrivacy.config).toMatchObject({
      isHeadless: true,
      asyncConsent: true,
    });
    expect(loadScriptMock).toHaveBeenCalledTimes(1);
  });

  it('reaches ready once the CDN assigns the API', async () => {
    const onReady = vi.fn();
    renderHook(() => useCustomerPrivacy({...PROPS, onReady}));
    await act(async () => {});

    const cdnSetTrackingConsent = vi.fn();
    await act(async () => {
      window.Shopify.customerPrivacy = {
        ...window.Shopify.customerPrivacy,
        consentStatus: 'loaded',
        setTrackingConsent: cdnSetTrackingConsent,
      } as any;
      document.dispatchEvent(new CustomEvent('consentTrackingApiLoaded'));
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    // The config-bound override was applied, not just the raw CDN API read.
    expect(getCustomerPrivacy()?.setTrackingConsent).not.toBe(
      cdnSetTrackingConsent,
    );
  });

  it('does not throw when the existing object is frozen', async () => {
    window.Shopify = Object.freeze({theme: 'from-an-extension'}) as any;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => renderHook(() => useCustomerPrivacy(PROPS))).not.toThrow();
    await act(async () => {});

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not configure `window.Shopify'),
    );
    // Without the headless config the CDN bundles would misbehave.
    expect(loadScriptMock).not.toHaveBeenCalled();
  });
});
