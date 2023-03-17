import {createElement, type ReactNode} from 'react';

export interface RichTextASTNode {
  type: string;
  children?: RichTextASTNode[];
  level?: number;
  value?: string;
  bold?: boolean;
  italic?: boolean;
  url?: string;
  title?: string;
  target?: string;
  listType?: string;
}

export interface RichTextPropsBase<ComponentGeneric extends React.ElementType> {
  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`. */
  as?: ComponentGeneric;
  /** An object with fields that correspond to the Storefront API's [RichText format](https://shopify.dev/docs/apps/custom-data/metafields/types#rich-text-formatting). */
  data: RichTextASTNode;
}

// This article helps understand the typing here https://www.benmvp.com/blog/polymorphic-react-components-typescript/ Ben is the best :)
export type RichTextProps<ComponentGeneric extends React.ElementType> =
  RichTextPropsBase<ComponentGeneric> &
    Omit<
      React.ComponentPropsWithoutRef<ComponentGeneric>,
      keyof RichTextPropsBase<ComponentGeneric>
    >;

export function RichText<ComponentGeneric extends React.ElementType = 'div'>({
  as,
  data,
  ...passthroughProps
}: RichTextProps<ComponentGeneric>): JSX.Element {
  const Wrapper = as ?? 'div';

  return (
    <Wrapper {...passthroughProps}>{serializeRichTextASTNode(data)}</Wrapper>
  );
}

function serializeRichTextASTNode(node: RichTextASTNode, index = 0): ReactNode {
  switch (node.type) {
    case 'root':
      return (
        <div key={index}>{node.children?.map(serializeRichTextASTNode)}</div>
      );
    case 'heading':
      return createElement(
        `h${node.level ?? '1'}`,
        null,
        node.children?.map(serializeRichTextASTNode),
      );
    case 'paragraph':
      return <p key={index}>{node.children?.map(serializeRichTextASTNode)}</p>;
    case 'text':
      return (
        <span
          key={index}
          style={{
            fontWeight: node.bold ? 'bold' : undefined,
            fontStyle: node.italic ? 'italic' : undefined,
          }}
        >
          {node.value}
        </span>
      );
    case 'link':
      return (
        <a key={index} href={node.url} title={node.title} target={node.target}>
          {node.children?.map(serializeRichTextASTNode)}
        </a>
      );
    case 'list':
      // eslint-disable-next-line no-case-declarations
      const List = node.listType === 'unordered' ? 'ul' : 'ol';

      return (
        <List key={index}>
          {node.children?.map((item) => {
            if (!item.children) {
              return null;
            }

            return (
              <li key={item.children[0].value}>
                {item.children.map(serializeRichTextASTNode)}
              </li>
            );
          })}
        </List>
      );
    default:
      return null;
  }
}

export function richTextToString(
  node: RichTextASTNode,
  result: string[] = [],
): string {
  if (node.children && node.children.length > 0) {
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
    }
  }

  return result.join('').trim();
}

// This is only for documenation purposes, and it is not used in the code.
export type RichTextPropsForDocs<AsType extends React.ElementType = 'div'> =
  RichTextPropsBase<AsType>;
