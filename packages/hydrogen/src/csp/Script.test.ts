import {createElement} from 'react';
import {Script} from './Script';
import {describe, it, expect, afterEach} from 'vitest';
import {cleanup, render} from '@testing-library/react';
import {NonceProvider} from './csp';

describe('<Script />', () => {
  afterEach(() => {
    cleanup();
  });

  it('should add a nonce to the script', () => {
    const {asFragment} = render(
      createElement(NonceProvider, {
        value: 'somenonce',
        children: createElement(Script, {src: 'https://some-src.js'}),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <script
          nonce="somenonce"
          src="https://some-src.js"
        />
      </DocumentFragment>
    `);
  });
});
