import {createElement, type ReactNode} from 'react';
import type {
  HeadingASTNode,
  LinkASTNode,
  ListASTNode,
  ListItemASTNode,
  Next,
  ParagraphASTNode,
  RootASTNode,
  TextASTNode,
} from './RichText.types.js';

export type CustomComponents = {
  /** The root node of the rich text. Defaults to `<div>` */
  root?: typeof Root;
  /** Headings, level 1-6. Defaults to `<h1>` to `<h6>` */
  heading?: typeof Heading;
  /** Paragraph, defaults to `<p>` */
  paragraph?: typeof Paragraph;
  /** Text node that can be either bold or italic. Defaults to `<em>`, `<strong>` or text. */
  text?: typeof Text;
  /** Paragraph, defaults to `<a>` */
  link?: typeof RichTextLink;
  /** List, either ordered or unordered. Defaults to `<ol>` or `<ul>` */
  list?: typeof List;
  /** List items. Defaults to `<li>`. */
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

function Root({node, next}: {node: RootASTNode; next: Next}): ReactNode {
  return <div>{node.children?.map(next)}</div>;
}

function Heading({node, next}: {node: HeadingASTNode; next: Next}): ReactNode {
  return createElement(`h${node.level ?? '1'}`, null, node.children?.map(next));
}

function Paragraph({
  node,
  next,
}: {
  node: ParagraphASTNode;
  next: Next;
}): ReactNode {
  return <p>{node.children?.map(next)}</p>;
}

function Text({node}: {node: TextASTNode; next: Next}): ReactNode {
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
  next,
}: {
  node: LinkASTNode;
  next: Next;
}): ReactNode {
  return (
    <a href={node.url} title={node.title} target={node.target}>
      {node.children?.map(next)}
    </a>
  );
}

function List({node, next}: {node: ListASTNode; next: Next}): ReactNode {
  const List = node.listType === 'unordered' ? 'ul' : 'ol';
  return <List>{node.children?.map(next)}</List>;
}

function ListItem({
  node,
  next,
}: {
  node: ListItemASTNode;
  next: Next;
}): ReactNode {
  return <li>{node.children?.map(next)}</li>;
}
