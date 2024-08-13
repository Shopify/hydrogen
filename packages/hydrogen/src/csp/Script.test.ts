import {createElement} from 'react';
import {Script} from './Script';
import {vi, describe, it, expect, afterEach} from 'vitest';
import {cleanup, render} from '@testing-library/react';
import {NonceProvider} from './csp';
import {useLoadScript} from '@shopify/hydrogen-react';

vi.mock('@shopify/hydrogen-react', () => ({
  useLoadScript: vi.fn(),
}));

describe('<Script />', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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

  it('loads an inline script', () => {
    const {asFragment} = render(
      createElement(NonceProvider, {
        value: 'somenonce',
        children: createElement(Script, {
          dangerouslySetInnerHTML: {__html: 'alert("hi")'},
        }),
      }),
    );

    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <script
          nonce="somenonce"
        >
          alert("hi")
        </script>
      </DocumentFragment>
    `);
  });

  it('should load scripts after hydration', () => {
    const {asFragment} = render(
      createElement(NonceProvider, {
        value: 'somenonce',
        children: createElement(Script, {
          waitForHydration: true,
          src: 'https://some-src.js',
        }),
      }),
    );

    // No actual script rendered to the page
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment />
    `);

    expect(useLoadScript).toHaveBeenCalledWith('https://some-src.js', {
      attributes: {},
    });
  });

  it('throws without a src prop when using waitForHydration', () => {
    function renderComponent() {
      render(
        createElement(NonceProvider, {
          value: 'somenonce',
          children: createElement(Script, {
            waitForHydration: true,
          }),
        }),
      );
    }
    expect(renderComponent).toThrowError(
      '`waitForHydration` with the Script copmonent requires a `src` prop',
    );
  });
});
