import {createElement, type ReactNode} from 'react';
import type {RichTextASTNode} from './RichText.types.js';
import {
  type CustomComponents,
  RichTextComponents,
} from './RichText.components.js';

export interface RichTextPropsBase<ComponentGeneric extends React.ElementType> {
  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`. */
  as?: ComponentGeneric;
  /** An object with fields that correspond to the Storefront API's [RichText format](https://shopify.dev/docs/apps/custom-data/metafields/types#rich-text-formatting). */
  data: RichTextASTNode;
  /** Customize how rich text components are rendered */
  components?: CustomComponents;
  /** Remove rich text formatting and render plain text */
  plain?: boolean;
}

export function RichText<ComponentGeneric extends React.ElementType = 'div'>({
  as,
  data,
  plain,
  components,
  ...passthroughProps
}: RichTextProps<ComponentGeneric>): JSX.Element {
  const Wrapper = as ?? 'div';

  return (
    <Wrapper {...passthroughProps}>
      {plain
        ? richTextToString(data)
        : serializeRichTextASTNode(components, data)}
    </Wrapper>
  );
}

// This article helps understand the typing here https://www.benmvp.com/blog/polymorphic-react-components-typescript/ Ben is the best :)
export type RichTextProps<ComponentGeneric extends React.ElementType> =
  RichTextPropsBase<ComponentGeneric> &
    Omit<
      React.ComponentPropsWithoutRef<ComponentGeneric>,
      keyof RichTextPropsBase<ComponentGeneric>
    >;

function serializeRichTextASTNode(
  components: CustomComponents = {},
  node: RichTextASTNode,
  index = 0,
): ReactNode {
  let children;
  if ('children' in node) {
    children = node.children.map((child) =>
      serializeRichTextASTNode(components, child, index),
    );
  }

  const Component =
    components[node.type === 'list-item' ? 'listItem' : node.type] ??
    RichTextComponents[node.type];

  switch (node.type) {
    case 'root':
      return createElement(
        Component as Exclude<CustomComponents['root'], undefined>,
        {
          key: index,
          node: {
            type: 'root',
            children,
          },
        },
      );
    case 'heading':
      return createElement(
        Component as Exclude<CustomComponents['heading'], undefined>,
        {
          key: index,
          node: {
            type: 'heading',
            level: node.level,
            children,
          },
        },
      );
    case 'paragraph':
      return createElement(
        Component as Exclude<CustomComponents['paragraph'], undefined>,
        {
          key: index,
          node: {
            type: 'paragraph',
            children,
          },
        },
      );
    case 'text':
      return createElement(
        Component as Exclude<CustomComponents['text'], undefined>,
        {
          key: index,
          node: {
            type: 'text',
            italic: node.italic,
            bold: node.bold,
            value: node.value,
          },
        },
      );
    case 'link':
      return createElement(
        Component as Exclude<CustomComponents['link'], undefined>,
        {
          key: index,
          node: {
            type: 'link',
            url: node.url,
            title: node.title,
            target: node.target,
            children,
          },
        },
      );
    case 'list':
      return createElement(
        Component as Exclude<CustomComponents['list'], undefined>,
        {
          key: index,
          node: {
            type: 'list',
            listType: node.listType,
            children,
          },
        },
      );
    case 'list-item':
      return createElement(
        Component as Exclude<CustomComponents['listItem'], undefined>,
        {
          key: index,
          node: {
            type: 'list-item',
            children,
          },
        },
      );
  }

  // if (node.type in RichTextComponents) {
  //   const Component =
  //     components[node.type === 'list-item' ? 'listItem' : node.type] as FunctionComponent<{

  //     }>;

  //   return createElement(
  //     (components[
  //       node.type === 'list-item' ? 'listItem' : node.type
  //     ] as FunctionComponent<{
  //       node: RichTextASTNode;
  //       children: ReactNode[];
  //     }>) ??
  //       (RichTextComponents[node.type] as FunctionComponent<{
  //         node: RichTextASTNode;
  //         children: ReactNode[];
  //       }>),
  //     {
  //       key: index,
  //       node,
  //       children,
  //     },
  //   );
  // }

  return null;
}

function richTextToString(
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
