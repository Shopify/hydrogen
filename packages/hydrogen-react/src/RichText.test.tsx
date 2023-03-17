import {describe, expect, it} from 'vitest';

import {
  RICH_TEXT_HEADING_1,
  RICH_TEXT_HEADING_2,
  RICH_TEXT_PARAGRAPH,
  RICH_TEXT_COMPLEX_PARAGRAPH,
  RICH_TEXT_ORDERED_LIST,
  RICH_TEXT_UNORDERED_LIST,
  RICH_TEXT_CONTENT,
} from './RichText.test.helpers.js';
import {RichText} from './RichText.js';
import {render, screen} from '@testing-library/react';

describe('<RichText />', () => {
  it('renders <RichText /> with an empty node', () => {
    render(<RichText data={{type: 'root'}} as="main" />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders <RichText /> with a heading 1 data', () => {
    render(<RichText data={RICH_TEXT_HEADING_1} />);

    const parent = screen.getByText('Heading 1').parentElement as HTMLElement;
    expect(parent.tagName).toBe('H1');
  });

  it('renders <RichText /> with a heading 2 data', () => {
    render(<RichText data={RICH_TEXT_HEADING_2} />);

    const parent = screen.getByText('Heading 2').parentElement as HTMLElement;
    expect(parent.tagName).toBe('H2');
  });

  it('renders <RichText /> with a paragraph data', () => {
    render(<RichText data={RICH_TEXT_PARAGRAPH} />);

    const parent = screen.getByText('Paragraph').parentElement as HTMLElement;
    expect(parent.tagName).toBe('P');
  });

  it('renders <RichText /> with a complex paragraph data', () => {
    render(<RichText data={RICH_TEXT_COMPLEX_PARAGRAPH} />);
    const textItalic = screen.getByText('This');
    const textBold = screen.getByText('text');
    const externalLink = screen.getByText('external link');
    const externalLinkParent = externalLink.parentElement as HTMLElement;
    const internalLink = screen.getByText('link');
    const internalLinkParent = internalLink.parentElement as HTMLElement;

    expect(textItalic).toHaveStyle('font-style: italic');
    expect(textBold).toHaveStyle('font-weight: bold');
    expect(externalLinkParent.tagName).toBe('A');
    expect(externalLinkParent).toHaveAttribute('href', 'https://shopify.com');
    expect(externalLinkParent).toHaveAttribute('target', '_blank');
    expect(internalLinkParent.tagName).toBe('A');
    expect(internalLinkParent).toHaveAttribute('href', '/products/foo');
    expect(internalLinkParent).toHaveAttribute('target', '_blank');
  });

  it('renders <RichText /> with an ordered list data', () => {
    render(<RichText data={RICH_TEXT_ORDERED_LIST} />);

    const listItemOne = screen.getByText('One').parentElement as HTMLElement;
    const listItemTwo = screen.getByText('Two').parentElement as HTMLElement;
    const listParent = listItemOne.parentElement as HTMLElement;

    expect(listItemOne.tagName).toBe('LI');
    expect(listItemTwo.tagName).toBe('LI');
    expect(listParent.tagName).toBe('OL');
  });

  it('renders <RichText /> with an unordered list data', () => {
    render(<RichText data={RICH_TEXT_UNORDERED_LIST} />);

    const listItemOne = screen.getByText('One').parentElement as HTMLElement;
    const listItemTwo = screen.getByText('Two').parentElement as HTMLElement;
    const listParent = listItemOne.parentElement as HTMLElement;

    expect(listItemOne.tagName).toBe('LI');
    expect(listItemTwo.tagName).toBe('LI');
    expect(listParent.tagName).toBe('UL');
  });

  it('renders <RichText /> with multiple children in root', () => {
    render(<RichText data={RICH_TEXT_CONTENT} />);

    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
  });

  it('renders <RichText /> with specified as element', () => {
    const {container} = render(<RichText data={RICH_TEXT_CONTENT} as="main" />);
    const firstChild = container.firstChild as HTMLElement;
    expect(firstChild.tagName).toBe('MAIN');
  });

  it('supports passthrough props', () => {
    const {container} = render(
      <RichText data={RICH_TEXT_CONTENT} className="content" />,
    );
    const firstChild = container.firstChild as HTMLElement;
    expect(firstChild).toHaveClass('content');
  });
});
