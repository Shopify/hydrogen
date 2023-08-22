import {createCSPHeader, useNonce} from './csp';
import {createElement} from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {HydrogenServerProvider} from '../HydrogenServerProvider';
import {cleanup, render} from '@testing-library/react';

describe('createCSPHeader', () => {
  it('should create a default CSP header', () => {
    expect(createCSPHeader()).toBe(
      `base-uri 'self'; default-src 'unsafe-inline' https://cdn.shopify.com; frame-ancestors none; style-src 'self' 'unsafe-inline' https://cdn.shopify.com`,
    );
  });

  it('should add a nonce', () => {
    expect(createCSPHeader('somenonce')).toBe(
      `base-uri 'self'; default-src 'self' 'nonce-somenonce' https://cdn.shopify.com; frame-ancestors none; style-src 'self' 'unsafe-inline' https://cdn.shopify.com`,
    );
  });

  it('should add a nonce', () => {
    expect(
      createCSPHeader('somenonce', {
        styleSrc: [
          "'self'",
          'https://cdn.shopify.com',
          'https://some-custom-css.cdn',
        ],
      }),
    ).toBe(
      `base-uri 'self'; default-src 'self' 'nonce-somenonce' https://cdn.shopify.com; frame-ancestors none; style-src 'self' https://cdn.shopify.com https://some-custom-css.cdn`,
    );
  });
});

describe('useNonce', () => {
  afterEach(() => {
    cleanup();
  });

  it("get's the nonce", () => {
    const {asFragment} = render(
      createElement(HydrogenServerProvider, {
        nonce: 'somenonce',
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
