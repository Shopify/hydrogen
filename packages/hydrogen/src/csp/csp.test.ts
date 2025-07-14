import {createContentSecurityPolicy, useNonce} from './csp';
import {createElement} from 'react';
import {describe, it, expect, afterEach, vi} from 'vitest';
import {cleanup, render} from '@testing-library/react';

vi.mock('./nonce.js', () => {
  return {
    generateNonce() {
      return 'somenonce';
    },
  };
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('createContentSecurityPolicy', () => {
  it('creates default policy', () => {
    expect(createContentSecurityPolicy().header).toMatchInlineSnapshot(
      `"base-uri 'self'; default-src 'self' https://cdn.shopify.com https://shopify.com 'nonce-somenonce'; frame-ancestors 'none'; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; connect-src 'self' https://monorail-edge.shopifysvc.com"`,
    );
  });

  it('adds custom directives', () => {
    expect(
      createContentSecurityPolicy({
        styleSrc: ['https://some-custom-css.cdn'],
      }).header,
    ).toMatchInlineSnapshot(
      `"base-uri 'self'; default-src 'self' https://cdn.shopify.com https://shopify.com 'nonce-somenonce'; frame-ancestors 'none'; style-src https://some-custom-css.cdn 'self' 'unsafe-inline' https://cdn.shopify.com; connect-src 'self' https://monorail-edge.shopifysvc.com"`,
    );
  });

  it('sets shopify domain directives', () => {
    expect(
      createContentSecurityPolicy({
        shop: {
          storeDomain: 'test.myshopify.com',
          checkoutDomain: 'checkout.myshopify.com',
        },
      }).header,
    ).toMatchInlineSnapshot(
      `"base-uri 'self'; default-src 'self' https://cdn.shopify.com https://shopify.com 'nonce-somenonce'; frame-ancestors 'none'; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; connect-src 'self' https://monorail-edge.shopifysvc.com https://checkout.myshopify.com https://test.myshopify.com"`,
    );
  });

  it('adds nonce to custom directives', () => {
    expect(
      createContentSecurityPolicy({
        scriptSrc: ['https://some-custom-css.cdn'],
      }).header,
    ).toMatchInlineSnapshot(
      `"base-uri 'self'; default-src 'self' 'nonce-somenonce' https://cdn.shopify.com https://shopify.com; frame-ancestors 'none'; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; connect-src 'self' https://monorail-edge.shopifysvc.com; script-src https://some-custom-css.cdn 'nonce-somenonce'"`,
    );
  });

  it(`if default directive is 'none', then don't merge custom directive with default`, () => {
    expect(
      createContentSecurityPolicy({
        frameAncestors: [`'self'`],
      }).header,
    ).toContain(`frame-ancestors 'self';`);
  });
});

describe('useNonce', () => {
  afterEach(() => {
    cleanup();
  });

  it("get's the nonce", () => {
    const {NonceProvider} = createContentSecurityPolicy();
    const {asFragment} = render(
      createElement(NonceProvider, {
        children: createElement(SomeComponent),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          somenonce
        </div>
      </DocumentFragment>
    `);
  });

  it('returns undefined when called outside NonceProvider', () => {
    const {asFragment} = render(createElement(SomeComponentWithOptionalNonce));

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          No nonce available
        </div>
      </DocumentFragment>
    `);
  });
});

function SomeComponent() {
  const nonce = useNonce();
  return createElement('div', null, nonce);
}

function SomeComponentWithOptionalNonce() {
  const nonce = useNonce();
  return createElement('div', null, nonce ? nonce : 'No nonce available');
}
