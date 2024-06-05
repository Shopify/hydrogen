import {type RichTextASTNode} from './RichText.types.js';

export const RICH_TEXT_HEADING_1: RichTextASTNode = {
  type: 'heading',
  children: [
    {
      type: 'text',
      value: 'Heading 1',
    },
  ],
  level: 1,
};

export const RICH_TEXT_HEADING_2: RichTextASTNode = {
  type: 'heading',
  level: 2,
  children: [
    {
      type: 'text',
      value: 'Heading 2',
    },
  ],
};

export const RICH_TEXT_PARAGRAPH: RichTextASTNode = {
  type: 'paragraph',
  children: [
    {
      type: 'text',
      value: 'Paragraph',
    },
  ],
};

export const RICH_TEXT_NEW_LINES: RichTextASTNode = {
  type: 'paragraph',
  children: [
    {
      type: 'text',
      value: 'Paragraph\nwith\nlots\nof\nnew\nlines',
    },
  ],
};

export const RICH_TEXT_COMPLEX_PARAGRAPH: RichTextASTNode = {
  type: 'paragraph',
  children: [
    {
      type: 'text',
      value: 'This',
      italic: true,
    },
    {
      type: 'text',
      value: ' is a ',
    },
    {
      type: 'text',
      value: 'text',
      bold: true,
    },
    {
      type: 'text',
      value: ' and a ',
    },
    {
      url: '/products/foo',
      title: 'title',
      target: '_blank',
      type: 'link',
      children: [
        {
          type: 'text',
          value: 'link',
        },
      ],
    },
    {
      type: 'text',
      value: ' and an ',
    },
    {
      url: 'https://shopify.com',
      title: 'Title',
      target: '_blank',
      type: 'link',
      children: [
        {
          type: 'text',
          value: 'external link',
        },
      ],
    },
    {
      type: 'text',
      value: '',
    },
  ],
};

export const RICH_TEXT_ORDERED_LIST: RichTextASTNode = {
  listType: 'ordered',
  type: 'list',
  children: [
    {
      type: 'list-item',
      children: [
        {
          type: 'text',
          value: 'One',
        },
      ],
    },
    {
      type: 'list-item',
      children: [
        {
          type: 'text',
          value: 'Two',
        },
      ],
    },
  ],
};

export const RICH_TEXT_UNORDERED_LIST: RichTextASTNode = {
  listType: 'unordered',
  type: 'list',
  children: [
    {
      type: 'list-item',
      children: [
        {
          type: 'text',
          value: 'One',
        },
      ],
    },
    {
      type: 'list-item',
      children: [
        {
          type: 'text',
          value: 'Two',
        },
      ],
    },
  ],
};

export const RICH_TEXT_CONTENT: RichTextASTNode = {
  type: 'root',
  children: [
    RICH_TEXT_HEADING_1,
    RICH_TEXT_HEADING_2,
    RICH_TEXT_PARAGRAPH,
    RICH_TEXT_COMPLEX_PARAGRAPH,
    RICH_TEXT_ORDERED_LIST,
    RICH_TEXT_UNORDERED_LIST,
  ],
};
