import {createElement, FunctionComponent, type ReactNode} from 'react';
import type {Next, RichTextASTNode} from './RichText.types.js';
import {
  type CustomComponents,
  RichTextComponents,
} from './RichText.components.js';

export interface RichTextPropsBase<ComponentGeneric extends React.ElementType> {
  /** An HTML tag or React Component to be rendered as the base element wrapper. The default is `div`. */
  as?: ComponentGeneric;
  /** An object with fields that correspond to the Storefront API's [RichText format](https://shopify.dev/docs/apps/custom-data/metafields/types#rich-text-formatting). */
  data: RichTextASTNode;
  /** Customize how Rich Text components are rendered */
  components?: CustomComponents;
  /** Remove rich text formatting as plain text */
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
  const next = serializeRichTextASTNode.bind(null, components);

  if (node.type in RichTextComponents) {
    return createElement(
      (components[
        node.type === 'list-item' ? 'listItem' : node.type
      ] as FunctionComponent<{
        node: RichTextASTNode;
        next: Next;
      }>) ??
        (RichTextComponents[node.type] as FunctionComponent<{
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
