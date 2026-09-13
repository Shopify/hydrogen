import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {
  useCustomerPrivacy,
  getCustomerPrivacy,
} from './ShopifyCustomerPrivacy.js';

/**
 * Regression coverage for #3575.
 *
 * Browser extensions (Urban VPN is the commonly reported one) and theme-era
 * apps loaded into a headless storefront assign their own `window.Shopify`,
 * sometimes non-configurably. `Object.defineProperty(window, 'Shopify', …)`
 * then throws `TypeError: Cannot redefine property: Shopify`, which escaped the
 * effect and took the whole app down through the router error boundary.
 *
 * These tests live in their own file on purpose: a non-configurable property
 * can be neither deleted nor redefined, so once installed it cannot be undone
 * within a test environment. Vitest gives each file a fresh environment, which
 * keeps the pollution out of the main `useCustomerPrivacy` suite.
 */

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

const CUSTOMER_PRIVACY_PROPS = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: '3b580e70970c4528da70c98e097c2fa0',
  withPrivacyBanner: false,
};

// Stand in for the extension: present before Hydrogen runs, and locked down.
// `writable: true` still allows assignment, which is what the Shopify CDN does.
Object.defineProperty(window, 'Shopify', {
  configurable: false,
  writable: true,
  value: {},
});

describe('useCustomerPrivacy with a non-configurable window.Shopify', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.Shopify = {} as any;
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('script').forEach((node) => node.remove());
  });

  it('does not throw when the watcher cannot be installed', () => {
    window.Shopify = {theme: 'from-an-extension'} as any;

    expect(() =>
      renderHook(() => useCustomerPrivacy(CUSTOMER_PRIVACY_PROPS)),
    ).not.toThrow();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not observe `Shopify`'),
    );

    // The foreign global is left intact rather than clobbered.
    expect((window.Shopify as any).theme).toBe('from-an-extension');
  });

  it('still resolves customerPrivacy through the fallback path', async () => {
    const onReady = vi.fn();
    const initialProps = {...CUSTOMER_PRIVACY_PROPS, onReady};

    const {rerender} = renderHook((props) => useCustomerPrivacy(props), {
      initialProps,
    });

    // The CDN assigns the real API onto the extension's object. There is no
    // setter to observe it, so the fallback has to read it directly once the
    // consent script has settled.
    window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    } as any;

    await act(async () => {});
    rerender(initialProps);
    await act(async () => {});

    expect(getCustomerPrivacy()).not.toBeNull();
    expect(onReady).toHaveBeenCalled();
  });
});
