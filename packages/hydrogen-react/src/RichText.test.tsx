import {describe, expect, it} from 'vitest';

import {
  RICH_TEXT_HEADING_1,
  RICH_TEXT_HEADING_2,
  RICH_TEXT_PARAGRAPH,
  RICH_TEXT_COMPLEX_PARAGRAPH,
  RICH_TEXT_ORDERED_LIST,
  RICH_TEXT_UNORDERED_LIST,
  RICH_TEXT_CONTENT,
  RICH_TEXT_NEW_LINES,
} from './RichText.test.helpers.js';
import {RichText} from './RichText.js';
import {render, screen} from '@testing-library/react';

describe('<RichText />', () => {
  it('renders <RichText /> with an empty node', () => {
    render(
      <RichText
        data={JSON.stringify({type: 'root', children: []})}
        as="main"
      />,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders <RichText /> with a heading 1 data', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_HEADING_1)} />);
    expect(screen.getByText('Heading 1').tagName).toBe('H1');
  });

  it('renders <RichText /> a custom root node', () => {
    render(<RichText as="span" data={JSON.stringify(RICH_TEXT_HEADING_1)} />);
    expect(screen.getByText('Heading 1').parentElement?.tagName).toBe('SPAN');
  });

  it('renders <RichText /> with a heading 2 data', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_HEADING_2)} />);
    expect(screen.getByText('Heading 2').tagName).toBe('H2');
  });

  it('renders <RichText /> with a paragraph data', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_PARAGRAPH)} />);
    expect(screen.getByText('Paragraph').tagName).toBe('P');
  });

  it('renders <RichText /> with a newlines', () => {
    const {container} = render(
      <RichText data={JSON.stringify(RICH_TEXT_NEW_LINES)} />,
    );

    expect(container.querySelector('p')?.innerHTML).toMatchInlineSnapshot(
      `"Paragraph<br>with<br>lots<br>of<br>new<br>lines"`,
    );
  });

  it('renders <RichText /> with a complex paragraph data', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_COMPLEX_PARAGRAPH)} />);
    const textItalic = screen.getByText('This');
    const textBold = screen.getByText('text');
    const externalLink = screen.getByText('external link');
    const internalLink = screen.getByText('link');

    expect(textItalic.tagName).toBe('EM');
    expect(textBold.tagName).toBe('STRONG');
    expect(externalLink.tagName).toBe('A');
    expect(externalLink).toHaveAttribute('href', 'https://shopify.com');
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(internalLink.tagName).toBe('A');
    expect(internalLink).toHaveAttribute('href', '/products/foo');
    expect(internalLink).toHaveAttribute('target', '_blank');
  });

  it('renders <RichText /> with an ordered list data', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_ORDERED_LIST)} />);

    const listItemOne = screen.getByText('One');
    const listItemTwo = screen.getByText('Two');
    const listParent = listItemOne.parentElement as HTMLElement;

    expect(listItemOne.tagName).toBe('LI');
    expect(listItemTwo.tagName).toBe('LI');
    expect(listParent.tagName).toBe('OL');
  });

  it('renders <RichText /> with an unordered list data', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_UNORDERED_LIST)} />);

    const listItemOne = screen.getByText('One');
    const listItemTwo = screen.getByText('Two');
    const listParent = listItemOne.parentElement as HTMLElement;

    expect(listItemOne.tagName).toBe('LI');
    expect(listItemTwo.tagName).toBe('LI');
    expect(listParent.tagName).toBe('UL');
  });

  it('renders <RichText /> with multiple children in root', () => {
    render(<RichText data={JSON.stringify(RICH_TEXT_CONTENT)} />);

    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
  });

  it('renders <RichText /> with specified as element', () => {
    const {container} = render(
      <RichText data={JSON.stringify(RICH_TEXT_CONTENT)} as="main" />,
    );
    const firstChild = container.firstChild as HTMLElement;
    expect(firstChild.tagName).toBe('MAIN');
  });

  it('supports passthrough props', () => {
    const {container} = render(
      <RichText data={JSON.stringify(RICH_TEXT_CONTENT)} className="content" />,
    );
    const firstChild = container.firstChild as HTMLElement;
    expect(firstChild).toHaveClass('content');
  });

  describe('Custom components', () => {
    it('renders a custom heading component', () => {
      render(
        <RichText
          data={JSON.stringify(RICH_TEXT_HEADING_1)}
          components={{
            heading: ({node}) => <thead>{node.children}</thead>,
          }}
        />,
      );
      expect(screen.getByText('Heading 1').tagName).toBe('THEAD');
    });

    it('renders a custom paragraph component', () => {
      render(
        <RichText
          data={JSON.stringify(RICH_TEXT_PARAGRAPH)}
          components={{
            paragraph: ({node}) => <table>{node.children}</table>,
          }}
        />,
      );
      expect(screen.getByText('Paragraph').tagName).toBe('TABLE');
    });
  });

  describe('Plain text', () => {
    it('renders plain text paragraph', () => {
      render(<RichText data={JSON.stringify(RICH_TEXT_PARAGRAPH)} plain />);
      expect(screen.getByText('Paragraph').tagName).toBe('DIV');
    });

    it('renders plain text complex paragraph', () => {
      render(
        <RichText data={JSON.stringify(RICH_TEXT_COMPLEX_PARAGRAPH)} plain />,
      );
      const plain = screen.getByText(
        'This is a text and a link and an external link',
      );
      expect(plain.tagName).toBe('DIV');
    });
  });
});
