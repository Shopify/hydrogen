import {createElement} from 'react';
import {Script} from './Script';
import {HydrogenServerProvider} from '../HydrogenServerProvider';
import {describe, it, expect, afterEach, vi, afterAll} from 'vitest';
import {cleanup, render} from '@testing-library/react';

describe('<Script />', () => {
  afterEach(() => {
    cleanup();
  });

  it('should add a nonce to the script', () => {
    const {asFragment} = render(
      createElement(HydrogenServerProvider, {
        nonce: 'somenonce',
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
