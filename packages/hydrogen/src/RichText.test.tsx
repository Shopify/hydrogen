import {describe, expect, it, vi} from 'vitest';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {RichText} from './RichText';

function linkData(url: string) {
  return JSON.stringify({
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            url,
            title: 'Link title',
            target: '_blank',
            children: [{type: 'text', value: 'Formatted link', bold: true}],
          },
          {type: 'text', value: 'Sibling text'},
        ],
      },
    ],
  });
}

function renderRichText(
  url: string,
  components?: React.ComponentProps<typeof RichText>['components'],
) {
  return render(
    <MemoryRouter>
      <RichText data={linkData(url)} components={components} />
    </MemoryRouter>,
  );
}

describe('<RichText />', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' \t\r\njavascript:alert(1)',
    '\u0000javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'https://[',
  ])('renders unsafe URL %j as formatted text', (url) => {
    const {container} = renderRichText(url);
    expect(container.querySelector('strong')).toHaveTextContent(
      'Formatted link',
    );
    expect(container).toHaveTextContent('Sibling text');
    expect(container.querySelector('a')).toBeNull();
  });

  it.each([
    'https://shopify.com',
    '/products/foo',
    'products/foo',
    '?page=2',
    '#details',
    '//shopify.com/products',
    'mailto:help@example.com',
    'tel:+15555550123',
    'sms:+15555550123',
  ])('preserves safe URL %j and link attributes', (url) => {
    const {container} = renderRichText(url);
    const link = container.querySelector('a');
    const expectedHref = ['products/foo', '?page=2', '#details'].includes(url)
      ? `/${url}`
      : url;
    expect(link).toHaveAttribute('href', expectedHref);
    expect(link).toHaveAttribute('title', 'Link title');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link?.querySelector('strong')).toHaveTextContent('Formatted link');
  });

  it('preserves custom link overrides and original node properties', () => {
    const url = 'javascript:alert(1)';
    const customLink = vi.fn(({node}) => (
      <span data-custom-link>{node.children}</span>
    ));
    const {container} = renderRichText(url, {link: customLink});
    expect(customLink.mock.calls[0][0].node).toMatchObject({
      url,
      title: 'Link title',
      target: '_blank',
    });
    expect(
      container.querySelector('[data-custom-link] strong'),
    ).toHaveTextContent('Formatted link');
    expect(container.querySelector('a')).toBeNull();
  });
});
