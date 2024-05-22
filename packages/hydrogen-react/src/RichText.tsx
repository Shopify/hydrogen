import {createElement, FunctionComponent, type ReactNode} from 'react';

type RootASTNode = {
  type: 'root';
  children: RichTextASTNode[];
};

type HeadingASTNode = {
  type: 'heading';
  level: number;
  children: RichTextASTNode[];
};

type ParagraphASTNode = {
  type: 'paragraph';
  children: RichTextASTNode[];
};

type TextASTNode = {
  type: 'text';
  value?: string;
  bold?: boolean;
  italic?: boolean;
};

type LinkASTNode = {
  type: 'link';
  url: string;
  title: string;
  target: string;
  children: RichTextASTNode[];
};

type ListASTNode = {
  type: 'list';
  children: ListItemASTNode[];
  listType: string;
};

type ListItemASTNode = {
  type: 'list-item';
  children: RichTextASTNode[];
};

export type RichTextASTNode =
  | RootASTNode
  | HeadingASTNode
  | ParagraphASTNode
  | TextASTNode
  | LinkASTNode
  | ListASTNode
  | ListItemASTNode;

export interface RichTextPropsBase<ComponentGeneric extends React.ElementType> {
  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`. */
  as?: ComponentGeneric;
  /** An object with fields that correspond to the Storefront API's [RichText format](https://shopify.dev/docs/apps/custom-data/metafields/types#rich-text-formatting). */
  data: RichTextASTNode;
  /** Customize how Rich Text components are rendered */
  components?: CustomComponents;
}

type CustomComponents = {
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

// This article helps understand the typing here https://www.benmvp.com/blog/polymorphic-react-components-typescript/ Ben is the best :)
export type RichTextProps<ComponentGeneric extends React.ElementType> =
  RichTextPropsBase<ComponentGeneric> &
    Omit<
      React.ComponentPropsWithoutRef<ComponentGeneric>,
      keyof RichTextPropsBase<ComponentGeneric>
    >;

type Next = (node: RichTextASTNode) => ReactNode;

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

export function RichText<ComponentGeneric extends React.ElementType = 'div'>({
  as,
  data,
  components,
  ...passthroughProps
}: RichTextProps<ComponentGeneric>): JSX.Element {
  const Wrapper = as ?? 'div';

  return (
    <Wrapper {...passthroughProps}>
      {serializeRichTextASTNode(components, data)}
    </Wrapper>
  );
}

const COMPONENT_MAP = {
  root: Root,
  heading: Heading,
  paragraph: Paragraph,
  text: Text,
  link: RichTextLink,
  list: List,
  'list-item': ListItem,
};

function serializeRichTextASTNode(
  components: CustomComponents = {},
  node: RichTextASTNode,
  index = 0,
): ReactNode {
  const next = serializeRichTextASTNode.bind(null, components);

  if (node.type in COMPONENT_MAP) {
    return createElement(
      (components[
        node.type === 'list-item' ? 'listItem' : node.type
      ] as FunctionComponent<{
        node: RichTextASTNode;
        next: Next;
      }>) ??
        (COMPONENT_MAP[node.type] as FunctionComponent<{
          node: RichTextASTNode;
          next: Next;
        }>),
      {
        key: index,
        node,
        next,
      },
    );
  }

  return null;
}

export function richTextToString(
  node: RichTextASTNode,
  result: string[] = [],
): string {
  switch (node.type) {
    case 'root':
      node.children.forEach((child) => richTextToString(child, result));
      break;
    case 'heading':
    case 'paragraph':
      node.children.forEach((child) => richTextToString(child, result));
      result.push(' ');
      break;
    case 'text':
      result.push(node.value || '');
      break;
    case 'link':
      node.children.forEach((child) => richTextToString(child, result));
      break;
    case 'list':
      node.children.forEach((item) => {
        if (item.children) {
          item.children.forEach((child) => richTextToString(child, result));
        }
        result.push(' ');
      });
      break;
    default:
      throw new Error(`Unknown node encountered ${node.type}`);
  }

  return result.join('').trim();
}

// This is only for documenation purposes, and it is not used in the code.
export type RichTextPropsForDocs<AsType extends React.ElementType = 'div'> =
  RichTextPropsBase<AsType>;
