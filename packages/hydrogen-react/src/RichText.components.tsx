import {createElement, type ReactNode} from 'react';

export type CustomComponents = {
  /** The root node of the rich text. Defaults to `<div>` */
  root?: typeof Root;
  /** Customize the headings. Each heading has a `level` property from 1-6. Defaults to `<h1>` to `<h6>` */
  heading?: typeof Heading;
  /** Customize paragraphs. Defaults to `<p>` */
  paragraph?: typeof Paragraph;
  /** Customize how text nodes. They can either be bold or italic. Defaults to `<em>`, `<strong>` or text. */
  text?: typeof Text;
  /** Customize links. Defaults to a React Router `<Link>` component in Hydrogen and a `<a>` in Hydrogen React. */
  link?: typeof RichTextLink;
  /** Customize lists. They can be either ordered or unordered. Defaults to `<ol>` or `<ul>` */
  list?: typeof List;
  /** Customize list items. Defaults to `<li>`. */
  listItem?: typeof ListItem;
};

export const RichTextComponents = {
  root: Root,
  heading: Heading,
  paragraph: Paragraph,
  text: Text,
  link: RichTextLink,
  list: List,
  'list-item': ListItem,
};

function Root({
  node,
}: {
  node: {
    type: 'root';
    children?: ReactNode[];
  };
}): ReactNode {
  return <div>{node.children}</div>;
}

function Heading({
  node,
}: {
  node: {
    type: 'heading';
    level: number;
    children?: ReactNode[];
  };
}): ReactNode {
  return createElement(`h${node.level ?? '1'}`, null, node.children);
}

function Paragraph({
  node,
}: {
  node: {
    type: 'paragraph';
    children?: ReactNode[];
  };
}): ReactNode {
  return <p>{node.children}</p>;
}

function Text({
  node,
}: {
  node: {
    type: 'text';
    italic?: boolean;
    bold?: boolean;
    value?: string;
  };
}): ReactNode {
  if (node.bold && node.italic)
    return (
      <em>
        <strong>{node.value}</strong>
      </em>
    );

  if (node.bold) return <strong>{node.value}</strong>;
  if (node.italic) return <em>{node.value}</em>;

  return node.value;
}

function RichTextLink({
  node,
}: {
  node: {
    type: 'link';
    url: string;
    title?: string;
    target?: string;
    children?: ReactNode[];
  };
}): ReactNode {
  return (
    <a href={node.url} title={node.title} target={node.target}>
      {node.children}
    </a>
  );
}

function List({
  node,
}: {
  node: {
    type: 'list';
    listType: 'unordered' | 'ordered';
    children?: ReactNode[];
  };
}): ReactNode {
  const List = node.listType === 'unordered' ? 'ul' : 'ol';
  return <List>{node.children}</List>;
}

function ListItem({
  node,
}: {
  node: {
    type: 'list-item';
    children?: ReactNode[];
  };
}): ReactNode {
  return <li>{node.children}</li>;
}
