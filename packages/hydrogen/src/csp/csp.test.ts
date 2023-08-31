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
    expect(createContentSecurityPolicy().header).toBe(
      `base-uri 'self'; default-src 'self' 'nonce-somenonce' https://cdn.shopify.com https://shopify.com; frame-ancestors none; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; connect-src 'self' https://monorail-edge.shopifysvc.com`,
    );
  });

  it('adds custom directives', () => {
    expect(
      createContentSecurityPolicy({
        styleSrc: [
          "'self'",
          'https://cdn.shopify.com',
          'https://some-custom-css.cdn',
        ],
      }).header,
    ).toBe(
      `base-uri 'self'; default-src 'self' 'nonce-somenonce' https://cdn.shopify.com https://shopify.com; frame-ancestors none; style-src 'self' https://cdn.shopify.com https://some-custom-css.cdn; connect-src 'self' https://monorail-edge.shopifysvc.com`,
    );
  });

  it('adds nonce to custom directives', () => {
    expect(
      createContentSecurityPolicy({
        scriptSrc: [
          "'self'",
          'https://cdn.shopify.com',
          'https://some-custom-css.cdn',
        ],
      }).header,
    ).toBe(
      `base-uri 'self'; default-src 'self' 'nonce-somenonce' https://cdn.shopify.com https://shopify.com; frame-ancestors none; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; connect-src 'self' https://monorail-edge.shopifysvc.com; script-src 'self' https://cdn.shopify.com https://some-custom-css.cdn 'nonce-somenonce'`,
    );
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
});

function SomeComponent() {
  const nonce = useNonce();
  return createElement('div', null, nonce);
}
