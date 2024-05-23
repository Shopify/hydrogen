import type {ReactNode} from 'react';

export type Next = (node: RichTextASTNode) => ReactNode;

export type RootASTNode = {
  type: 'root';
  children: RichTextASTNode[];
};

export type HeadingASTNode = {
  type: 'heading';
  level: number;
  children: RichTextASTNode[];
};

export type ParagraphASTNode = {
  type: 'paragraph';
  children: RichTextASTNode[];
};

export type TextASTNode = {
  type: 'text';
  value?: string;
  bold?: boolean;
  italic?: boolean;
};

export type LinkASTNode = {
  type: 'link';
  url: string;
  title: string;
  target: string;
  children: RichTextASTNode[];
};

export type ListASTNode = {
  type: 'list';
  children: ListItemASTNode[];
  listType: string;
};

export type ListItemASTNode = {
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
