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
  /** The root node of the rich text. Make sure to map over the children calling `next` on each. Defaults to `<div>` */
  root?: typeof Root;
  /** Customize the headings. Each heading has a `level` property from 1-6. Make sure to map over the children calling `next` on each. Defaults to `<h1>` to `<h6>` */
  heading?: typeof Heading;
  /** Customize paragraphs. Make sure to map over the children calling `next` on each. Defaults to `<p>` */
  paragraph?: typeof Paragraph;
  /** Customize how text nodes. They can either be bold or italic. Defaults to `<em>`, `<strong>` or text. */
  text?: typeof Text;
  /** Customize links. Make sure to map over the children calling `next` on each. Defaults to `<a>` */
  link?: typeof RichTextLink;
  /** Customize lists. They can be either ordered or unordered. Make sure to map over the children calling `next` on each. Defaults to `<ol>` or `<ul>` */
  list?: typeof List;
  /** Customize list items. Make sure to map over the children calling `next` on each. Defaults to `<li>`. */
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
