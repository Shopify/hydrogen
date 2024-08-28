import {vi, describe, it, beforeEach, afterEach, expect} from 'vitest'
import {renderHook, act} from '@testing-library/react';
import {useCustomerPrivacy, CONSENT_API, CONSENT_API_WITH_BANNER} from './ShopifyCustomerPrivacy.js';

let html: HTMLHtmlElement;
let head: HTMLHeadElement;
let body: HTMLBodyElement;

const CUSTOMER_PRIVACY_PROPS = {
  checkoutDomain: 'checkout.shopify.com',
  storefrontAccessToken: 'test-token',
}

describe(`useCustomerPrivacy`, () => {
  beforeEach(() => {
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
  });

  it('loads the customerPrivacy with privacyBanner script', () => {
    renderHook(() => useCustomerPrivacy(CUSTOMER_PRIVACY_PROPS))
    const script = html.querySelector('body script');
    expect(script).toContainHTML(`src="${CONSENT_API_WITH_BANNER}"`);
    expect(script).toContainHTML('type="text/javascript"');
  });

  it('loads just the customerPrivacy script', () => {
    renderHook(() => useCustomerPrivacy({
      ...CUSTOMER_PRIVACY_PROPS,
      withPrivacyBanner: false
    }))
    const script = html.querySelector('body script');
    expect(script).toContainHTML(`src="${CONSENT_API}"`);
    expect(script).toContainHTML('type="text/javascript"');
  });

  it('returns just customerPrivacy initiallly as null', () => {
    let cp;
    renderHook(() => {
       cp = useCustomerPrivacy({
        ...CUSTOMER_PRIVACY_PROPS,
        withPrivacyBanner: false
      })
    })
    expect(cp).toEqual({customerPrivacy: null})
  });

  it('returns both customerPrivacy and privacyBanner initially as null', async () => {
    let cp;
    renderHook(() => {
       cp = useCustomerPrivacy({
        ...CUSTOMER_PRIVACY_PROPS,
        withPrivacyBanner: true
      })
    })

    // Wait until idle
    await act(async () => {});

    expect(cp).toEqual({customerPrivacy: null, privacyBanner: null})
  });

  it('returns only customerPrivacy', async () => {
    let cp;

   const initialProps = {
    ...CUSTOMER_PRIVACY_PROPS,
    withPrivacyBanner: false
   }

    const {rerender} = renderHook((props) => {
       cp = useCustomerPrivacy(props)
    }, { initialProps })

    rerender(initialProps)

    // mock the original customerPrivacy script injected APIs. It first defines the global object
    // @ts-ignore
    global.window.Shopify = {}
    global.window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    }

    // mock the original privacyBanner script injected APIs
    rerender(initialProps)

    expect(cp).toEqual({
      customerPrivacy: expect.objectContaining({
        setTrackingConsent: expect.any(Function),
      })
    })
  });

  it('returns both customerPrivacy and privaceBanner', async () => {
    let cp;

    const {rerender} = renderHook((props) => {
       cp = useCustomerPrivacy(props)
    }, { initialProps: CUSTOMER_PRIVACY_PROPS })

    rerender(CUSTOMER_PRIVACY_PROPS)

    // mock the original customerPrivacy script injected APIs. It first defines the global object
    // @ts-ignore
    global.window.Shopify = {}
    global.window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    }

    // mock the original privacyBanner script injected APIs
    rerender(CUSTOMER_PRIVACY_PROPS)

    // mock the original privacyBanner script injected APIs
    global.window.privacyBanner = {
      loadBanner: () => {},
      showPreferences: () => {},
    }

    // mock the original privacyBanner script injected APIs
    rerender(CUSTOMER_PRIVACY_PROPS)

    expect(cp).toEqual({
      customerPrivacy: expect.objectContaining({
        setTrackingConsent: expect.any(Function),
      }),
      privacyBanner: expect.objectContaining({
        loadBanner: expect.any(Function),
        showPreferences: expect.any(Function),
      })
    })
  });


  it('triggers the onReady callback when both APIs are ready', async () => {
    const onReady = vi.fn();

    let cp;
    const {rerender} = renderHook((props) => {
       cp = useCustomerPrivacy(props)
    }, { initialProps: {...CUSTOMER_PRIVACY_PROPS, onReady }})

    rerender({...CUSTOMER_PRIVACY_PROPS, onReady})

    // mock the original customerPrivacy script injected APIs. It first defines the global object
    // @ts-ignore
    global.window.Shopify = {}
    global.window.Shopify.customerPrivacy = {
      setTrackingConsent: () => {},
    }

    // mock the original privacyBanner script injected APIs
    rerender({...CUSTOMER_PRIVACY_PROPS, onReady})

    // mock the original privacyBanner script injected APIs
    global.window.privacyBanner = {
      loadBanner: () => {},
      showPreferences: () => {},
    }

    rerender({...CUSTOMER_PRIVACY_PROPS, onReady})

    expect(onReady).toHaveBeenCalled();
  });
});
